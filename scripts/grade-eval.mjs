#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, writeFile, readdir, mkdir, mkdtemp, cp } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dependencies = join(root, 'verification');
const require = createRequire(join(dependencies, 'package.json'));
const ts = require('typescript');
const { chromium, expect: baseExpect } = require('@playwright/test');
const expect = baseExpect.configure({ timeout: 3000 });
const { createServer } = await import(require.resolve('vite'));
const scenarios = new Set(['keyboard-editor', 'repair-flow']);

async function sourceFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', 'artifacts', '.git'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) files.push(path);
  }
  return files.sort();
}

export async function gradeEval(scenario, candidateDir) {
  assert(scenarios.has(scenario), `Unknown scenario: ${scenario}`);
  const candidate = resolve(candidateDir);
  const artifacts = join(dependencies, 'artifacts');
  await mkdir(artifacts, { recursive: true });
  const work = await mkdtemp(join(artifacts, `eval-${scenario}-`));
  const checks = [];
  const report = { scenario, checks, passed: false, candidateHash: '', artifacts: work };
  const record = async (name, action) => {
    try { await action(); checks.push({ name, passed: true }); return true; }
    catch (error) { checks.push({ name, passed: false, error: String(error.message).slice(0, 2500) }); return false; }
  };
  let server, browser, context, page;
  try {
    await cp(candidate, work, { recursive: true, filter: path => !['node_modules', '.git', 'artifacts'].includes(path.split('/').pop()) });
    const files = await sourceFiles(work);
    assert(files.some(f => f === join(work, 'App.tsx')), 'Candidate must provide App.tsx');
    const hash = createHash('sha256');
    for (const file of files) hash.update(file.slice(work.length)).update(await readFile(file));
    report.candidateHash = hash.digest('hex');
    const typed = await record('typecheck', () => {
      const program = ts.createProgram(files.filter(file => !file.endsWith('.css')), {
        strict: true, noEmit: true, skipLibCheck: true, jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler, esModuleInterop: true,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      assert.equal(diagnostics.length, 0, ts.formatDiagnostics(diagnostics, {
        getCanonicalFileName: f => f, getCurrentDirectory: () => work, getNewLine: () => '\n',
      }));
    });
    if (!typed) return report;
    await writeFile(join(work, 'index.html'), '<!doctype html><html lang="en"><head><title>Skill evaluation</title></head><body><div id="root"></div><script type="module" src="/main.tsx"></script></body></html>');
    await writeFile(join(work, 'main.tsx'), `
      import React, { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import App from './App';
      import '@xyflow/react/dist/style.css';
      document.body.style.margin = '0';
      createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
    `);
    server = await createServer({ root: work, configFile: false, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
    context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();
    page.setDefaultTimeout(3000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
    const node = id => page.locator(`.react-flow__node[data-id="${id}"]`);
    const edges = page.locator('.react-flow__edge');
    const reset = async () => { await page.goto(url); await expect(page.locator('.react-flow__node')).toHaveCount(2); };
    await page.goto(url);
    const rendered = await record('initial-nodes', async () => {
      await expect(page.locator('.react-flow__node')).toHaveCount(2);
      await expect(node('source')).toBeVisible(); await expect(node('result')).toBeVisible();
    });
    if (!rendered) return report;
    async function tabTo(locator) {
      for (let i = 0; i < 30; i++) {
        if (await locator.evaluate(el => el === document.activeElement)) return;
        await page.keyboard.press('Tab');
      }
      await expect(locator).toBeFocused();
    }
    if (scenario === 'keyboard-editor') {
      await record('keyboard-connect', async () => {
        await expect(edges).toHaveCount(0);
        const from = page.getByRole('combobox', { name: /^From\b/ });
        const to = page.getByRole('combobox', { name: /^To\b/ });
        // Set the opposite choices as a precondition, then complete the form using only keys.
        await from.selectOption('result'); await to.selectOption('source');
        await tabTo(from); await page.keyboard.press('s');
        await expect(from).toHaveValue('source');
        await tabTo(to); await page.keyboard.press('r'); await expect(to).toHaveValue('result');
        await tabTo(page.getByRole('button', { name: 'Connect steps', exact: true }));
        await page.keyboard.press('Enter'); await expect(edges).toHaveCount(1);
        await expect(page.getByRole('status')).not.toHaveText('');
        const success = await page.getByRole('status').textContent();
        await page.keyboard.press('Enter'); await expect(edges).toHaveCount(1);
        await expect(page.getByRole('status')).not.toHaveText(success);
      });
      await record('self-connection-rejected', async () => {
        await reset();
        await page.getByRole('combobox', { name: /^From\b/ }).selectOption('source');
        await page.getByRole('combobox', { name: /^To\b/ }).selectOption('source');
        await page.getByRole('button', { name: 'Connect steps', exact: true }).click();
        await expect(edges).toHaveCount(0); await expect(page.getByRole('status')).not.toHaveText('');
      });
      await record('rename-and-text-editing', async () => {
        await reset();
        const input = page.getByLabel('Source label', { exact: true });
        await tabTo(input); await input.fill('Renamed source');
        await expect(page.getByRole('combobox', { name: /^From\b/ }).locator('option[value="source"]')).toHaveText('Renamed source');
        await expect(node('source')).toHaveAttribute('aria-label', /Renamed source/i);
        await input.press('End'); await input.press('Backspace');
        await expect(input).toHaveValue('Renamed sourc');
        await expect(page.locator('.react-flow__node')).toHaveCount(2);
      });
      await record('keyboard-node-movement', async () => {
        await reset(); await tabTo(node('source'));
        await page.screenshot({ path: join(work, 'keyboard-focus.png'), timeout: 15000 });
        await page.keyboard.press('Enter');
        await expect(node('source')).toHaveClass(/selected/);
        const before = await node('source').boundingBox();
        await page.keyboard.press('ArrowRight');
        await expect.poll(async () => (await node('source').boundingBox()).x).toBeGreaterThan(before.x);
        await page.keyboard.press('Backspace');
        await expect(page.locator('.react-flow__node')).toHaveCount(1);
      });
    } else {
      await record('initial-edge', async () => {
        await expect(edges).toHaveCount(1);
        await expect(page.locator('.react-flow__edge-path')).toHaveAttribute('d', /^M.+/);
      });
      await record('reactive-calculation', async () => {
        await reset(); await expect(page.getByLabel('Result', { exact: true })).toHaveText('4');
        await page.getByLabel('Value', { exact: true }).fill('7');
        await expect(page.getByLabel('Result', { exact: true })).toHaveText('14');
        await page.screenshot({ path: join(work, 'repaired.png'), timeout: 15000 });
      });
      await record('drag-persists', async () => {
        await reset();
        const inputBox = await page.getByLabel('Value', { exact: true }).boundingBox();
        const before = await node('source').boundingBox();
        // Drag the padded node border, outside the input.
        const x = before.x + 4, y = before.y + 4;
        assert(inputBox.x > x || inputBox.y > y, 'Drag point must be outside input');
        await page.mouse.move(x, y); await page.mouse.down();
        await page.mouse.move(x + 60, y + 30, { steps: 8 }); await page.mouse.up();
        await page.getByLabel('Value', { exact: true }).fill('9'); // another state update must retain the drag
        await expect.poll(async () => (await node('source').boundingBox()).x).toBeGreaterThan(before.x + 40);
      });
      await record('input-does-not-drag-or-delete', async () => {
        await reset(); const input = page.getByLabel('Value', { exact: true });
        await input.fill('27'); const before = await node('source').boundingBox();
        const b = await input.boundingBox();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2 + 25, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
        await expect.poll(async () => Math.abs((await node('source').boundingBox()).x - before.x)).toBeLessThan(1);
        await input.press('Backspace'); await expect(page.locator('.react-flow__node')).toHaveCount(2);
      });
      await record('connection-creation', async () => {
        await reset();
        await edges.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Backspace');
        await expect(edges).toHaveCount(0);
        const source = await page.locator('[data-nodeid="source"].source').boundingBox();
        const target = await page.locator('[data-nodeid="result"].target').boundingBox();
        assert(source && target, 'Both connection handles must exist');
        await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
        await page.mouse.down();
        await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 10 });
        await page.mouse.up();
        await expect(edges).toHaveCount(1);
        await expect(page.locator('.react-flow__edge-path')).toHaveAttribute('d', /^M.+/);
      });
      await record('node-deletion-cleans-edge', async () => {
        await reset(); await node('source').focus(); await page.keyboard.press('Enter');
        await page.keyboard.press('Backspace');
        await expect(page.locator('.react-flow__node')).toHaveCount(1); await expect(edges).toHaveCount(0);
      });
    }
    await record('no-browser-errors', () => assert.deepEqual(errors, []));
    report.passed = checks.every(c => c.passed);
    return report;
  } catch (error) {
    checks.push({ name: 'harness', passed: false, error: String(error.stack ?? error) });
    return report;
  } finally {
    await page?.screenshot({ path: join(work, 'result.png'), timeout: 15000 }).catch(() => {});
    await context?.tracing.stop({ path: join(work, 'trace.zip') }).catch(() => {});
    await browser?.close(); await server?.close();
    await writeFile(join(work, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.passed ? 'PASS' : 'FAIL'} ${scenario}: ${checks.filter(c => c.passed).length}/${checks.length} checks; ${join(work, 'report.json')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [scenario, candidate] = process.argv.slice(2);
  assert(scenario && candidate, 'Usage: node scripts/grade-eval.mjs <keyboard-editor|repair-flow> <candidate-directory>');
  const report = await gradeEval(scenario, candidate);
  process.exitCode = report.passed ? 0 : 1;
}
