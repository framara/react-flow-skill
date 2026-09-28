#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'verification/package.json'));
const MarkdownIt = require('markdown-it');
const { parse } = require('yaml');
const { default: GithubSlugger } = await import(require.resolve('github-slugger'));
const md = new MarkdownIt();
const skip = new Set(['.git', 'node_modules', 'artifacts']);
async function markdownFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name) || entry.name.startsWith('examples-')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path));
    else if (entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}
const documents = new Map();
for (const path of await markdownFiles(root)) {
  const raw = await readFile(path, 'utf8');
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const tokens = md.parse(body, {});
  const slugger = new GithubSlugger();
  const anchors = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === 'heading_open') {
      const text = tokens[i + 1].children?.filter(t => ['text', 'code_inline'].includes(t.type)).map(t => t.content).join('') ?? tokens[i + 1].content;
      anchors.add(slugger.slug(text));
    }
    if (tokens[i].type === 'fence') {
      // Markdown accepts an unterminated fence at EOF; reference code should not.
      const end = tokens[i].map[1] - 1;
      assert(new RegExp(`^\\s*${tokens[i].markup[0]}{${tokens[i].markup.length},}\\s*$`).test(body.split(/\r?\n/)[end]), `${relative(root, path)}: unclosed code fence`);
    }
  }
  documents.set(path, { raw, tokens, anchors });
}
const problems = [];
for (const [path, { tokens }] of documents) {
  for (const token of tokens.flatMap(t => t.children ?? [])) {
    const href = token.type === 'link_open' ? token.attrGet('href') : token.type === 'image' ? token.attrGet('src') : null;
    if (!href || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    const [file, hash] = href.split('#');
    const target = file ? resolve(dirname(path), decodeURIComponent(file)) : path;
    try {
      await stat(target);
      if (hash && documents.has(target) && !documents.get(target).anchors.has(decodeURIComponent(hash))) {
        problems.push(`${relative(root, path)}: missing heading ${href}`);
      }
    } catch { problems.push(`${relative(root, path)}: missing file ${href}`); }
  }
}
const skill = documents.get(join(root, 'SKILL.md')).raw;
const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
assert(match, 'SKILL.md needs YAML frontmatter');
const metadata = parse(match[1]);
assert.equal(metadata.name, 'react-flow', 'Preserve the published skill name');
assert(typeof metadata.description === 'string' && metadata.description.trim().length > 0, 'Skill description is required');
const routed = new Set([...skill.matchAll(/`(references\/[^`]+\.md)`/g)].map(m => m[1]));
for (const target of routed) if (!documents.has(join(root, target))) problems.push(`SKILL.md: missing route ${target}`);
const references = [...documents.keys()].filter(p => dirname(p) === join(root, 'references'));
for (const path of references) if (!routed.has(relative(root, path))) problems.push(`SKILL.md: unrouted reference ${relative(root, path)}`);
const readme = documents.get(join(root, 'README.md')).raw;
assert.equal(Number(readme.match(/across (\d+) reference topics/)?.[1]), references.length, 'README topic count must match reference files');
assert.deepEqual(problems, [], 'Broken Markdown links/routes');
console.log(`PASS documentation: ${documents.size} files, ${references.length} references, frontmatter, local links, headings, fences and routes`);
