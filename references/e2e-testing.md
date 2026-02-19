# E2E Testing with Playwright

## When to use this reference

Use this file when writing Playwright end-to-end tests for React Flow applications: selecting nodes and edges, testing drag interactions, verifying viewport behavior, asserting connections, or setting up test infrastructure for flow-based UIs.

## Contents

- [Playwright setup for React Flow](#playwright-setup-for-react-flow)
- [React Flow selector reference](#react-flow-selector-reference)
- [Test fixture: controlled flow component](#test-fixture-controlled-flow-component)
- [Node tests](#node-tests)
- [Edge tests](#edge-tests)
- [Connection tests](#connection-tests)
- [Viewport tests](#viewport-tests)
- [Toolbar and overlay tests](#toolbar-and-overlay-tests)
- [Wait and stability strategies](#wait-and-stability-strategies)
- [Helper utilities](#helper-utilities)
- [Playwright configuration tips](#playwright-configuration-tips)
- [Do / Don't](#do--dont)

## Playwright setup for React Flow

Minimal `playwright.config.ts` with a `webServer` block for a Vite or Next.js dev server:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

For Next.js, change the command and port:

```ts
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```

## React Flow selector reference

### CSS class selectors

| Selector | Element |
|----------|---------|
| `.react-flow` | Root container |
| `.react-flow__renderer` | Main renderer wrapper |
| `.react-flow__viewport` | Viewport (transform applied here) |
| `.react-flow__pane` | Background pane (receives pan/click events) |
| `.react-flow__nodes` | Node container |
| `.react-flow__node` | Individual node |
| `.react-flow__node-default` | Default node type |
| `.react-flow__node-input` | Input node type |
| `.react-flow__node-output` | Output node type |
| `.react-flow__node-group` | Group node type |
| `.react-flow__edges` | Edge container (SVG) |
| `.react-flow__edge` | Individual edge |
| `.react-flow__edge-path` | Edge path element |
| `.react-flow__edge-interaction` | Edge interaction area (wider invisible path for click targets) |
| `.react-flow__connection` | Active connection line |
| `.react-flow__connectionline` | Connection line path |
| `.react-flow__handle` | Handle element |
| `.react-flow__handle-top` | Handle positioned at top |
| `.react-flow__handle-right` | Handle positioned at right |
| `.react-flow__handle-bottom` | Handle positioned at bottom |
| `.react-flow__handle-left` | Handle positioned at left |
| `.react-flow__minimap` | MiniMap component |
| `.react-flow__controls` | Controls component |
| `.react-flow__background` | Background component |
| `.react-flow__panel` | Panel component |
| `.react-flow__node-toolbar` | NodeToolbar component |
| `.react-flow__nodesselection` | Multi-selection box |
| `.react-flow__selection` | Selection rectangle |

### Data attributes

| Attribute | Used on | Example |
|-----------|---------|---------|
| `data-id` | Nodes, edges | `[data-id="node-1"]` |
| `data-nodeid` | Handles | `[data-nodeid="node-1"]` |
| `data-handleid` | Handles | `[data-handleid="output-a"]` |
| `data-handlepos` | Handles | `[data-handlepos="right"]` |
| `data-testid` | Custom elements | `[data-testid="custom-node"]` |

### Combined selector patterns

```ts
// Select a specific node
page.locator('.react-flow__node[data-id="node-1"]');

// Select a specific edge
page.locator('.react-flow__edge[data-id="edge-1-2"]');

// Select the source handle on a specific node
page.locator('[data-nodeid="node-1"].react-flow__handle-bottom');

// Select a specific handle by ID on a node
page.locator('[data-nodeid="node-1"][data-handleid="output-a"]');

// Select all selected nodes
page.locator('.react-flow__node.selected');

// Select all selected edges
page.locator('.react-flow__edge.selected');

// Count all nodes
page.locator('.react-flow__node');

// The viewport element (for reading transforms)
page.locator('.react-flow__viewport');
```

## Test fixture: controlled flow component

A reusable test component ensures deterministic starting state:

```tsx
import { useCallback, useState } from 'react';
import {
  ReactFlow,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  { id: 'node-1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'node-2', position: { x: 250, y: 100 }, data: { label: 'Node 2' } },
  { id: 'node-3', position: { x: 250, y: 250 }, data: { label: 'Node 3' } },
];

const initialEdges: Edge[] = [
  { id: 'edge-1-2', source: 'node-1', target: 'node-2' },
];

export default function TestFlow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}
```

**Critical**: The container `div` must have explicit dimensions. Using `fitView` ensures all nodes are visible regardless of screen size, making tests deterministic.

## Node tests

### Select a node

```ts
import { test, expect } from '@playwright/test';

test('select a node by clicking', async ({ page }) => {
  await page.goto('/');
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await expect(node).toBeAttached();

  await node.click();
  await expect(node).toHaveClass(/selected/);
});
```

### Drag a node

**Critical**: Use `{ steps: 5 }` (or more) in `page.mouse.move`. Single-step moves do not trigger React Flow's drag handlers because React Flow requires multiple `mousemove` events.

```ts
test('drag a node changes its position', async ({ page }) => {
  await page.goto('/');
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await expect(node).toBeAttached();

  const beforeBox = await node.boundingBox();
  expect(beforeBox).not.toBeNull();

  // Drag from center of node
  const startX = beforeBox!.x + beforeBox!.width / 2;
  const startY = beforeBox!.y + beforeBox!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 100, startY + 50, { steps: 5 });
  await page.mouse.up();

  const afterBox = await node.boundingBox();
  expect(afterBox!.x).toBeGreaterThan(beforeBox!.x);
  expect(afterBox!.y).toBeGreaterThan(beforeBox!.y);
});
```

### Delete a node

```ts
test('delete a selected node with Backspace', async ({ page }) => {
  await page.goto('/');
  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(3);

  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.click();
  await page.keyboard.press('Backspace');

  await expect(nodes).toHaveCount(2);
});
```

### Verify node CSS classes and visibility

```ts
test('custom node has expected classes', async ({ page }) => {
  await page.goto('/');
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await expect(node).toBeVisible();
  await expect(node).toHaveClass(/react-flow__node-default/);
});
```

## Edge tests

### Select an edge

Edges are thin SVG paths — click the wider interaction area:

```ts
test('select an edge', async ({ page }) => {
  await page.goto('/');
  const edge = page.locator('.react-flow__edge[data-id="edge-1-2"]');
  await expect(edge).toBeAttached();

  // Click the interaction area (wider invisible path)
  const interactionPath = edge.locator('.react-flow__edge-interaction');
  await interactionPath.click();
  await expect(edge).toHaveClass(/selected/);
});
```

### Check edge markers

```ts
test('edge has arrow marker', async ({ page }) => {
  await page.goto('/');
  const edgePath = page.locator(
    '.react-flow__edge[data-id="edge-1-2"] .react-flow__edge-path',
  );
  await expect(edgePath).toHaveAttribute('marker-end', /url/);
});
```

### Delete an edge

```ts
test('delete a selected edge', async ({ page }) => {
  await page.goto('/');
  const edges = page.locator('.react-flow__edge');
  await expect(edges).toHaveCount(1);

  const interactionPath = page
    .locator('.react-flow__edge[data-id="edge-1-2"]')
    .locator('.react-flow__edge-interaction');
  await interactionPath.click();
  await page.keyboard.press('Backspace');

  await expect(edges).toHaveCount(0);
});
```

### Count edges after connection

```ts
test('new edge appears after connection', async ({ page }) => {
  await page.goto('/');
  const edges = page.locator('.react-flow__edge');
  await expect(edges).toHaveCount(1);

  // ... perform connection (see Connection tests) ...

  await expect(edges).toHaveCount(2);
});
```

## Connection tests

### Handle-to-handle connection

**Critical**: Use `{ steps: 5 }` in `page.mouse.move` — single-step moves skip React Flow's internal event processing and the connection will not register.

```ts
test('connect two nodes via handles', async ({ page }) => {
  await page.goto('/');
  const edges = page.locator('.react-flow__edge');
  await expect(edges).toHaveCount(1);

  // Source handle on node-1 (bottom)
  const sourceHandle = page.locator(
    '[data-nodeid="node-1"].react-flow__handle-bottom',
  );
  // Target handle on node-3 (top)
  const targetHandle = page.locator(
    '[data-nodeid="node-3"].react-flow__handle-top',
  );

  const sourceBBox = await sourceHandle.boundingBox();
  const targetBBox = await targetHandle.boundingBox();

  await page.mouse.move(
    sourceBBox!.x + sourceBBox!.width / 2,
    sourceBBox!.y + sourceBBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBBox!.x + targetBBox!.width / 2,
    targetBBox!.y + targetBBox!.height / 2,
    { steps: 5 },
  );
  await page.mouse.up();

  await expect(edges).toHaveCount(2);
});
```

### Connection line visibility during drag

```ts
test('connection line visible while dragging', async ({ page }) => {
  await page.goto('/');

  const sourceHandle = page.locator(
    '[data-nodeid="node-1"].react-flow__handle-bottom',
  );
  const sourceBBox = await sourceHandle.boundingBox();

  await page.mouse.move(
    sourceBBox!.x + sourceBBox!.width / 2,
    sourceBBox!.y + sourceBBox!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    sourceBBox!.x + 100,
    sourceBBox!.y + 100,
    { steps: 5 },
  );

  const connectionLine = page.locator('.react-flow__connection');
  await expect(connectionLine).toBeVisible();

  await page.mouse.up();
});
```

## Viewport tests

### Pan the viewport

```ts
test('pan by dragging the pane', async ({ page }) => {
  await page.goto('/');
  const viewport = page.locator('.react-flow__viewport');
  await expect(viewport).toBeAttached();

  const beforeTransform = await getTransform(page);

  // Drag on the pane (empty area)
  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  const startX = paneBox!.x + paneBox!.width / 2;
  const startY = paneBox!.y + paneBox!.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 150, startY + 100, { steps: 5 });
  await page.mouse.up();

  const afterTransform = await getTransform(page);
  expect(afterTransform.x).toBeGreaterThan(beforeTransform.x);
  expect(afterTransform.y).toBeGreaterThan(beforeTransform.y);
});
```

### Zoom with mouse wheel

```ts
test('zoom in with mouse wheel', async ({ page }) => {
  await page.goto('/');
  const viewport = page.locator('.react-flow__viewport');
  await expect(viewport).toBeAttached();

  const beforeTransform = await getTransform(page);

  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  await page.mouse.move(
    paneBox!.x + paneBox!.width / 2,
    paneBox!.y + paneBox!.height / 2,
  );

  // Negative deltaY = zoom in
  await page.mouse.wheel(0, -200);

  // Wait for zoom animation to settle
  await page.waitForTimeout(300);

  const afterTransform = await getTransform(page);
  expect(afterTransform.scale).toBeGreaterThan(beforeTransform.scale);
});
```

### Zoom constraints (minZoom / maxZoom)

```ts
test('zoom respects minZoom and maxZoom', async ({ page }) => {
  // Assumes the test fixture has minZoom={0.5} maxZoom={2}
  await page.goto('/');

  const pane = page.locator('.react-flow__pane');
  const paneBox = await pane.boundingBox();
  await page.mouse.move(
    paneBox!.x + paneBox!.width / 2,
    paneBox!.y + paneBox!.height / 2,
  );

  // Zoom in aggressively
  for (let i = 0; i < 20; i++) {
    await page.mouse.wheel(0, -200);
  }
  await page.waitForTimeout(300);

  const maxTransform = await getTransform(page);
  expect(maxTransform.scale).toBeLessThanOrEqual(2);

  // Zoom out aggressively
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 200);
  }
  await page.waitForTimeout(300);

  const minTransform = await getTransform(page);
  expect(minTransform.scale).toBeGreaterThanOrEqual(0.5);
});
```

### fitView

```ts
test('fitView makes all nodes visible', async ({ page }) => {
  await page.goto('/');

  // With fitView on the fixture, all nodes should be within the viewport
  const nodes = page.locator('.react-flow__node');
  const count = await nodes.count();

  for (let i = 0; i < count; i++) {
    await expect(nodes.nth(i)).toBeVisible();
  }
});
```

## Toolbar and overlay tests

### Toolbar visibility on node selection

```ts
test('NodeToolbar appears when node is selected', async ({ page }) => {
  await page.goto('/');
  const toolbar = page.locator('.react-flow__node-toolbar');

  // Toolbar hidden before selection
  await expect(toolbar).not.toBeVisible();

  // Select a node
  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.click();

  await expect(toolbar).toBeVisible();
});
```

### Toolbar positioning relative to node

```ts
test('toolbar is positioned above the node', async ({ page }) => {
  await page.goto('/');

  const node = page.locator('.react-flow__node[data-id="node-1"]');
  await node.click();

  const toolbar = page.locator('.react-flow__node-toolbar');
  await expect(toolbar).toBeVisible();

  const nodeBox = await node.boundingBox();
  const toolbarBox = await toolbar.boundingBox();

  // Toolbar should be above the node (lower y value)
  expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(nodeBox!.y);
});
```

## Wait and stability strategies

| Strategy | When to use |
|----------|-------------|
| `await expect(locator).toBeAttached()` | Wait for element to exist in the DOM (e.g., after page load) |
| `await expect(locator).toBeVisible()` | Wait for element to be visible (e.g., toolbar after selection) |
| `await expect(locator).toHaveCount(n)` | Wait for exact number of elements (e.g., edge count after connection) |
| `await expect(locator).toHaveClass(/selected/)` | Wait for class change (e.g., after clicking a node) |
| `await expect(locator).toHaveAttribute(attr, val)` | Wait for attribute value (e.g., edge markers) |
| `page.waitForTimeout(ms)` | **Last resort** — only for animations with no observable state change (e.g., zoom settle) |

**Prefer assertion-based waits** (`expect` with auto-retry) over `waitForTimeout`. Assertion-based waits are faster (they resolve as soon as the condition is met) and more reliable (they don't depend on timing).

Use `toHaveCount` instead of manual counting:

```ts
// WRONG — does not auto-retry
const count = await page.locator('.react-flow__node').count();
expect(count).toBe(3);

// CORRECT — auto-retries until condition met or timeout
await expect(page.locator('.react-flow__node')).toHaveCount(3);
```

## Helper utilities

### getTransform

Extracts translateX, translateY, and scale from the viewport's CSS transform. Based on the pattern used in the xyflow test suite:

```ts
async function getTransform(page: import('@playwright/test').Page) {
  return page.locator('.react-flow__viewport').evaluate((el) => {
    const style = window.getComputedStyle(el);
    const matrix = new DOMMatrix(style.transform);
    return {
      x: matrix.m41,
      y: matrix.m42,
      scale: matrix.a,
    };
  });
}
```

Usage:

```ts
const { x, y, scale } = await getTransform(page);
expect(scale).toBeGreaterThan(1); // zoomed in
```

### dragFromTo

Convenience helper for mouse drag operations:

```ts
async function dragFromTo(
  page: import('@playwright/test').Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 5,
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps });
  await page.mouse.up();
}
```

Usage:

```ts
const nodeBox = await node.boundingBox();
await dragFromTo(
  page,
  { x: nodeBox!.x + nodeBox!.width / 2, y: nodeBox!.y + nodeBox!.height / 2 },
  { x: nodeBox!.x + nodeBox!.width / 2 + 100, y: nodeBox!.y + nodeBox!.height / 2 + 50 },
);
```

### getBoundingBoxCenter

Get the center point of an element for mouse operations:

```ts
async function getBoundingBoxCenter(locator: import('@playwright/test').Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element not found or not visible');
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}
```

Usage:

```ts
const sourceCenter = await getBoundingBoxCenter(sourceHandle);
const targetCenter = await getBoundingBoxCenter(targetHandle);
await dragFromTo(page, sourceCenter, targetCenter);
```

## Playwright configuration tips

### CI configuration

```ts
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  use: {
    trace: 'on-first-retry',
  },
});
```

Traces on first retry capture screenshots, DOM snapshots, and network logs — invaluable for debugging flaky CI failures.

### Debugging locally

Run tests in headed mode to watch execution:

```bash
npx playwright test --headed
```

Pause execution at a specific point:

```ts
await page.pause(); // opens Playwright Inspector
```

Step through locators interactively:

```bash
npx playwright test --debug
```

### Viewport size

React Flow needs screen space. Set a reasonable viewport:

```ts
use: {
  viewport: { width: 1280, height: 720 },
},
```

### Test isolation

Each test gets a fresh page by default. If your tests share a fixture page, use `test.describe` with `beforeEach`:

```ts
test.describe('node interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.react-flow__node')).toHaveCount(3);
  });

  test('select node', async ({ page }) => { /* ... */ });
  test('drag node', async ({ page }) => { /* ... */ });
});
```

## Do / Don't

- Do use `{ steps: 5 }` (or more) in `page.mouse.move` for drag operations — single-step moves don't trigger React Flow's drag handlers.
- Do use `getTransform()` with `DOMMatrix` to read viewport position and scale — never parse CSS transform strings manually.
- Do use combined selectors like `.react-flow__node[data-id="node-1"]` for targeting specific elements.
- Do use `fitView` in test fixtures for deterministic starting positions.
- Do use assertion-based waits (`toHaveCount`, `toBeAttached`, `toBeVisible`) over `waitForTimeout`.
- Do use relative comparisons (greater than, less than) for position assertions rather than exact pixel values — viewport size and `fitView` calculations vary.
- Do give the container explicit dimensions (`100vw` x `100vh`) in test fixtures.
- Don't use `waitForTimeout` as a primary wait strategy — it's slow and flaky.
- Don't assert exact pixel coordinates — use bounding box comparisons (before vs. after) instead.
- Don't click edge paths directly — use `.react-flow__edge-interaction` for reliable edge clicking.
- Don't forget to `await expect(...).toBeAttached()` before reading `boundingBox()` — the element may not be in the DOM yet.
