#!/usr/bin/env node
// Execute selected Markdown examples against dependencies installed in a scratch directory.
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dependencyDir = process.argv[2] ?? join(root, 'verification');
const require = createRequire(join(resolve(dependencyDir), 'package.json'));
const ts = require('typescript');
const { chromium, expect } = require('@playwright/test');
const { createServer } = await import(require.resolve('vite'));
// Keep generated sources beside node_modules so normal module resolution works.
const artifacts = join(resolve(dependencyDir), 'artifacts');
await mkdir(artifacts, { recursive: true });
const work = await mkdtemp(join(artifacts, 'examples-'));
console.log(`Artifacts: ${work}`);
async function snippet(file, heading, language = 'tsx') {
  const text = await readFile(join(root, 'references', file + '.md'), 'utf8');
  const start = text.indexOf('\n' + heading + '\n');
  assert(start >= 0, `Missing heading: ${file}: ${heading}`);
  // Stay inside the requested section, so a moved/deleted example fails loudly.
  const rest = text.slice(start + heading.length + 2).split(/\n#{1,3} /)[0];
  const match = rest.match(new RegExp('```' + language + '\\n([\\s\\S]*?)\\n```'));
  assert(match, `Missing code block: ${file}: ${heading}`);
  return match[1];
}
const droppedConnection = await snippet('interactivity', '### Handling dropped connections (connecting to empty space)');
const sources = {
  KeyboardConnections: await snippet('accessibility', '## Keyboard connection creation'),
  ServerFlow: await snippet('ssr-and-hydration', '## A renderable flow'),
  Drop: "import { useCallback } from 'react';\nimport { useReactFlow, addEdge, type OnConnectEnd } from '@xyflow/react';\nexport function useDrop() {\nconst { setNodes, setEdges, screenToFlowPosition } = useReactFlow();\n" + droppedConnection + '\nreturn onConnectEnd;\n}',
  Narrowing: "import { useCallback } from 'react';\nimport type { Node, BuiltInNode, OnNodeDrag } from '@xyflow/react';\n" + (await snippet('typescript', '### Custom node types')) + '\nfunction isNumberNode(node: AppNode): node is NumberNode { return node.type === \'number\'; }\n' + (await snippet('typescript', '### OnNodeDrag with type narrowing')),
  Typed: await snippet('typescript', '## Complete typed flow example'),
  Minimal: await snippet('fundamentals', '## Minimal flow setup'),
  TestFlow: await snippet('e2e-testing', '## Test fixture: controlled flow component'),
  Dynamic: (await snippet('advanced-patterns', '## Dynamic handle generation')) + '\nexport default DynamicHandleNode;',
  Clipboard: await snippet('advanced-patterns', '### Pattern: in-memory clipboard'),
  Cycles: (await snippet('advanced-patterns', '### Cycle prevention using getOutgoers')) + '\nexport { useNoCycles };',
  AddAndFit: (await snippet('recipes', '## Fit view after adding nodes')) + '\nexport default AddAndFit;',
  Focus: "import { useReactFlow } from '@xyflow/react';\n" + (await snippet('components-and-hooks', '## Pan to a specific node')) + '\nexport default PanToNode;',
  Weighted: await snippet('typescript', '### Typed custom edge component'),
  TextPath: await snippet('custom-edges', '### SVG text along path'),
  TextInput: await snippet('advanced-patterns', '### Input node (writes data)'),
};
for (const [name, source] of Object.entries(sources)) await writeFile(join(work, name + '.tsx'), source);
const options = {
  strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
};
const program = ts.createProgram(Object.keys(sources).map(name => join(work, name + '.tsx')), options);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => work, getNewLine: () => '\n',
  }));
}
console.log(`PASS strict TypeScript: ${Object.keys(sources).length} extracted examples`);

// The layout example is an integration sketch: execute its JS-compatible code directly.
const layout = await snippet('layouting', '## Dagre integration');
await writeFile(join(work, 'layout.mjs'), layout + '\nexport { getLayoutedElements };');
const { getLayoutedElements } = await import(join(work, 'layout.mjs'));
const node = id => ({ id, position: { x: 0, y: 0 }, data: {}, measured: { width: 100, height: 40 } });
getLayoutedElements([node('a'), node('b')], [{ id: 'ab', source: 'a', target: 'b' }]);
assert.deepEqual(getLayoutedElements([node('b')], []).nodes[0].position, { x: 0, y: 0 });
console.log('PASS layout: deleted nodes and edges do not affect the next layout');

// Harness wrappers supply the provider/size/state intentionally omitted by hook snippets.
await writeFile(join(work, 'index.html'), '<div id="root"></div><script type="module" src="/main.tsx"></script>');
await writeFile(join(work, 'main.tsx'), `
import React, { StrictMode, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ReactFlow, ReactFlowProvider, Panel, useNodes, useEdges, useReactFlow, useNodesInitialized } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import KeyboardConnections from './KeyboardConnections';
import Typed from './Typed'; import Minimal from './Minimal'; import TestFlow from './TestFlow';
import Dynamic from './Dynamic'; import { useCopyPaste } from './Clipboard';
import { useNoCycles } from './Cycles'; import { useDrop } from './Drop'; import AddAndFit from './AddAndFit'; import Focus from './Focus';
const nodeTypes = { dynamic: Dynamic };
const groupNodes = [
  { id: 'group', type: 'group', position: { x: 100, y: 100 }, width: 300, height: 200, data: {}, selected: true },
  { id: 'child', parentId: 'group', position: { x: 20, y: 30 }, data: { label: 'Child' } },
];
function Probe() {
  const rf = useReactFlow(); const nodes = useNodes(); const edges = useEdges();
  const initialized = useNodesInitialized(); const clipboard = useCopyPaste();
  const reconnectingEdgeId = useRef<string | null>(null); const validate = useNoCycles(reconnectingEdgeId);
  useEffect(() => { window.probe = { rf, clipboard, validate, initialized, reconnectingEdgeId }; }, [rf, clipboard, validate, initialized, nodes, edges]);
  return null;
}
const mode = new URLSearchParams(location.search).get('mode');
function Harness() {
  const onConnectEnd = useDrop();
  const nodes = mode === 'keyboard' ? [
    { id: 'source', position: { x: 100, y: 180 }, data: { label: 'Source' } },
    { id: 'result', position: { x: 500, y: 180 }, data: { label: 'Result' } },
  ] : mode === 'copy' ? groupNodes : mode === 'focus' ? [
    { id: 'group', type: 'group', position: { x: 800, y: 600 }, width: 300, height: 200, data: {} },
    { id: 'node-1', parentId: 'group', position: { x: 20, y: 30 }, data: { label: 'Focus child' } },
  ] : (mode === 'dynamic' || mode === 'drop') ? [
    { id: 'dynamic', type: 'dynamic', position: { x: 0, y: 0 }, data: {} },
    { id: 'target', position: { x: 300, y: 100 }, data: { label: 'Target' } },
  ] : [{ id: 'initial', position: { x: 0, y: 0 }, data: { label: 'Initial' } }];
  return <div style={{ width: '100vw', height: '100vh' }}>
    <ReactFlow defaultNodes={nodes} defaultEdges={[]} nodeTypes={nodeTypes} fitView
      onConnectEnd={mode === 'drop' ? onConnectEnd : undefined}
      isValidConnection={mode === 'drop' ? () => false : undefined}>
      <Probe />{mode === 'keyboard' && <KeyboardConnections />}<Panel position="top-left">{mode === 'fit' && <AddAndFit />}{mode === 'focus' && <Focus />}</Panel>
    </ReactFlow>
  </div>;
}
document.body.style.margin = '0';
createRoot(document.getElementById('root')!).render(<StrictMode>
  {mode === 'typed' ? <Typed /> : mode === 'minimal' ? <Minimal /> : mode === 'test' ? <TestFlow /> :
    <ReactFlowProvider><Harness /></ReactFlowProvider>}
</StrictMode>);
`);
const server = await createServer({ root: work, configFile: false, server: { host: '127.0.0.1', port: 0 } });
let browser, context, page;
try {
  const { default: ServerFlow } = await server.ssrLoadModule('/ServerFlow.tsx');
  const React = require('react');
  const { renderToString } = require('react-dom/server');
  const serverMarkup = renderToString(React.createElement(ServerFlow));
  await writeFile(join(work, 'server-markup.html'), serverMarkup);
  assert(serverMarkup.includes('data-id="step-0"') && serverMarkup.includes('data-id="step-1"'), 'SSR must include both nodes');
  assert(/<path(?=[^>]*class="react-flow__edge-path")(?=[^>]*d="M[^"]+")[^>]*>/.test(serverMarkup), 'SSR must include an edge path');
  await writeFile(join(work, 'ssr.html'), '<!doctype html><html lang="en"><head><title>SSR flow</title><link rel="stylesheet" href="/node_modules/@xyflow/react/dist/style.css"></head><body><div id="root">' + serverMarkup + '</div><script type="module" src="/hydrate.tsx"></script></body></html>');
  await writeFile(join(work, 'hydrate.tsx'), `
    import React from 'react';
    import { hydrateRoot } from 'react-dom/client';
    import ServerFlow from './ServerFlow';
    import '@xyflow/react/dist/style.css';
    window.hydrationErrors = [];
    hydrateRoot(document.getElementById('root')!, <ServerFlow />, {
      onRecoverableError: (error) => window.hydrationErrors.push(String(error)),
    });
    window.hydrationStarted = true;
  `);
  // Use the bundled stylesheet URL, so the non-JavaScript page has styles too.
  const css = await readFile(require.resolve('@xyflow/react/dist/style.css'), 'utf8');
  await writeFile(join(work, 'ssr.css'), css);
  await writeFile(join(work, 'ssr.html'), (await readFile(join(work, 'ssr.html'), 'utf8')).replace('/node_modules/@xyflow/react/dist/style.css', '/ssr.css'));
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {});
  context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  async function open(mode) {
    await page.goto(`http://127.0.0.1:${address.port}/?mode=${mode}`);
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  }
  async function ready() { await page.waitForFunction(() => window.probe?.initialized); }
  const staticContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1000, height: 700 } });
  const staticPage = await staticContext.newPage();
  await staticPage.goto(`http://127.0.0.1:${address.port}/ssr.html`);
  await expect(staticPage.locator('.react-flow__node')).toHaveCount(2);
  await expect(staticPage.locator('.react-flow__edge-path')).toBeVisible();
  const staticPath = await staticPage.locator('.react-flow__edge-path').getAttribute('d');
  await staticPage.screenshot({ path: join(work, 'ssr-no-javascript.png') });
  await staticContext.close();
  const hydrationConsole = [];
  const captureConsole = message => { if (message.type() === 'error' || (message.type() === 'warning' && message.text().includes('[React Flow]'))) hydrationConsole.push(message.text()); };
  page.on('console', captureConsole);
  await page.goto(`http://127.0.0.1:${address.port}/ssr.html`);
  await page.waitForFunction(() => window.hydrationStarted);
  const hydratedNode = page.locator('.react-flow__node[data-id="step-0"]');
  await expect(hydratedNode).toBeVisible();
  await expect(page.locator('.react-flow__edge-path')).toHaveAttribute('d', staticPath);
  await hydratedNode.click();
  await expect(hydratedNode).toHaveClass(/selected/);
  assert.deepEqual(await page.evaluate(() => window.hydrationErrors), []);
  assert.deepEqual(hydrationConsole, []);
  page.off('console', captureConsole);
  console.log('PASS SSR/hydration: server nodes and edge visible without JS; hydration retains geometry and enables selection');

  await open('keyboard'); await ready();
  // Reach the form through Tab, then use native select and button keys only.
  const from = page.getByRole('combobox', { name: /^From\b/ });
  for (let i = 0; i < 20 && !(await from.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
  await expect(from).toBeFocused();
  await page.keyboard.press('s'); // native select typeahead: Source
  await expect(from).toHaveValue('source');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('combobox', { name: /^To\b/ })).toBeFocused();
  await page.keyboard.press('r'); // native select typeahead: Result
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Connect steps' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('Connection added.');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('These steps are already connected.');
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  console.log('PASS keyboard connection form: Tab/select/Enter create an edge and reject duplicates');

  await open('typed');
  await expect(page.locator('.react-flow__edge-path')).toHaveCount(1);
  await expect(page.locator('.react-flow__edge-path')).toHaveAttribute('d', /^M.+/);
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  for (const n of await page.locator('.react-flow__node').all()) await expect(n).toBeInViewport({ ratio: 0.999 });
  await page.screenshot({ path: join(work, 'typed-flow.png') });
  console.log('PASS typed flow: connected custom nodes render an edge and fit in viewport');

  await open('minimal');
  const first = page.locator('.react-flow__node[data-id="1"]');
  await expect(first).toBeInViewport({ ratio: 0.999 });
  const box = await first.boundingBox();
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(start.x + 80, start.y + 40, { steps: 8 }); await page.mouse.up();
  await expect.poll(async () => (await first.boundingBox()).x).toBeGreaterThan(box.x + 50);
  console.log('PASS minimal flow: node drag persists');

  await open('dynamic'); await ready();
  await page.getByRole('button', { name: '+ output' }).click({ clickCount: 1 });
  await page.getByRole('button', { name: '+ output' }).click();
  await expect(page.locator('[data-nodeid="dynamic"].source')).toHaveCount(3);
  await page.evaluate(() => window.probe.rf.addEdges({ id: 'dynamic-edge', source: 'dynamic', sourceHandle: 'out-3', target: 'target' }));
  await expect(page.locator('.react-flow__edge-path')).toHaveCount(1);
  console.log('PASS dynamic handles: new handle connects under React Strict Mode');

  await open('drop'); await ready();
  async function dragHandleTo(destination) {
    const handle = page.locator('[data-nodeid="dynamic"][data-handleid="out-1"]');
    const bounds = await handle.boundingBox();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y, { steps: 8 });
    await page.mouse.up();
  }
  const targetHandle = await page.locator('[data-nodeid="target"].target').boundingBox();
  await dragHandleTo({ x: targetHandle.x + targetHandle.width / 2, y: targetHandle.y + targetHandle.height / 2 });
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await dragHandleTo({ x: 800, y: 550 });
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__edge')).toHaveCount(1);
  assert.equal(await page.evaluate(() => window.probe.rf.getEdges()[0].sourceHandle), 'out-1');
  console.log('PASS dropped connections: invalid target rejected, empty-pane creation preserves source handle');

  await open('copy'); await ready();
  await page.evaluate(() => { window.probe.clipboard.copy(); window.probe.clipboard.paste(); });
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  const pasted = await page.evaluate(() => window.probe.rf.getNodes().filter(n => n.id !== 'group' && n.id !== 'child'));
  const parent = pasted.find(n => n.type === 'group'); const child = pasted.find(n => n.parentId);
  assert.deepEqual(parent.position, { x: 150, y: 150 });
  assert.deepEqual(child.position, { x: 20, y: 30 }); assert.equal(child.parentId, parent.id);
  await page.evaluate(() => window.probe.clipboard.cut());
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.evaluate(() => window.probe.clipboard.paste());
  await expect(page.locator('.react-flow__node')).toHaveCount(4);
  console.log('PASS clipboard: descendants copied, parent IDs remapped, local coordinates preserved, cut/paste restores group');

  await open('focus'); await ready();
  await page.getByRole('button', { name: 'Focus Node 1' }).click();
  const focused = page.locator('.react-flow__node[data-id="node-1"]');
  await expect.poll(async () => { const b = await focused.boundingBox(); return Math.abs(b.x + b.width / 2 - 500); }).toBeLessThan(2);
  await expect.poll(async () => { const b = await focused.boundingBox(); return Math.abs(b.y + b.height / 2 - 350); }).toBeLessThan(2);
  console.log('PASS focus: parent-relative node is centered in viewport');

  await open('fit'); await ready();
  await page.getByRole('button', { name: 'Add & Fit' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(2);
  await page.getByRole('button', { name: 'Add & Fit' }).click();
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  const ids = await page.evaluate(() => window.probe.rf.getNodes().map(n => n.id));
  assert.equal(new Set(ids).size, 3);
  for (const n of await page.locator('.react-flow__node').all()) await expect(n).toBeInViewport({ ratio: 0.999 });
  console.log('PASS add/fit: repeated additions have unique IDs and fit without timeout');

  await page.evaluate(() => {
    const { rf } = window.probe;
    rf.setNodes(['a', 'b', 'c'].map((id, i) => ({ id, data: { label: id }, position: { x: i * 200, y: 0 } })));
    rf.setEdges([{ id: 'ab', source: 'a', target: 'b' }, { id: 'bc', source: 'b', target: 'c' }]);
  });
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  const validity = await page.evaluate(() => {
    const { validate, reconnectingEdgeId } = window.probe;
    const connection = (source, target) => ({ source, target, sourceHandle: null, targetHandle: null });
    const cycle = validate(connection('c', 'a'));
    const valid = validate(connection('a', 'c'));
    const self = validate(connection('a', 'a'));
    reconnectingEdgeId.current = 'ab';
    const reversed = validate(connection('b', 'a')); // no ID in the candidate connection
    return { cycle, valid, self, reversed };
  });
  assert.deepEqual(validity, { cycle: false, valid: true, self: false, reversed: true });
  console.log('PASS cycle validation: cycles rejected and original reconnecting edge excluded');

  // Run real docs tests, including SVG path selection and viewport assertions.
  await open('test');
  const clickHelper = await snippet('e2e-testing', '### clickEdgePath', 'ts');
  const helperJs = ts.transpileModule(clickHelper, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const clickEdgePath = new Function('expect', helperJs + '\nreturn clickEdgePath;')(expect);
  const edge = page.locator('.react-flow__edge');
  await clickEdgePath(page, edge.locator('.react-flow__edge-interaction'));
  await expect(edge).toHaveClass(/selected/);
  await page.keyboard.press('Backspace'); await expect(edge).toHaveCount(0);
  console.log('PASS edge interaction: SVG path point selects and deletes edge');
  assert.deepEqual(errors, [], 'Browser page errors');
  console.log(`PASS browser checks; generated sources and screenshot: ${work}`);
} catch (error) {
  await page?.screenshot({ path: join(work, 'failure.png'), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await context?.tracing.stop({ path: join(work, 'trace.zip') }).catch(() => {});
  await browser?.close();
  await server.close();
}
