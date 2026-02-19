# Troubleshooting

## When to use this reference

Use this file when debugging React Flow issues: blank canvas, missing edges, rendering errors, performance problems, or unexpected behavior.

## Contents

- [Critical errors and fixes](#critical-errors-and-fixes)
- [Edge issues](#edge-issues)
- [Handle issues](#handle-issues)
- [Interaction issues](#interaction-issues)
- [State issues](#state-issues)
- [Build issues](#build-issues)
- [Debugging tools](#debugging-tools)
- [Quick diagnostic checklist](#quick-diagnostic-checklist)

## Critical errors and fixes

### Blank canvas / nothing renders

**Cause**: Parent container has no height.

**Fix**: The `<ReactFlow>` parent must have explicit dimensions:

```tsx
// WRONG
<div>
  <ReactFlow ... />
</div>

// CORRECT
<div style={{ width: '100%', height: '100vh' }}>
  <ReactFlow ... />
</div>
```

Also check: is `@xyflow/react/dist/style.css` imported?

### Nodes snap back after dragging

**Cause**: `onNodesChange` handler missing or not applying changes.

**Fix**:

```tsx
const onNodesChange = useCallback(
  (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
  [],
);

<ReactFlow onNodesChange={onNodesChange} ... />
```

### Connection line appears but no edge is created

**Cause**: `onConnect` handler missing.

**Fix**:

```tsx
const onConnect = useCallback(
  (connection) => setEdges((eds) => addEdge(connection, eds)),
  [],
);

<ReactFlow onConnect={onConnect} ... />
```

### "It looks like you have created a new nodeTypes or edgeTypes object"

**Cause**: `nodeTypes` or `edgeTypes` defined inside the component body, creating a new reference each render.

**Fix**: Move outside the component:

```tsx
// Outside component
const nodeTypes = { custom: CustomNode };

function Flow() {
  return <ReactFlow nodeTypes={nodeTypes} ... />;
}
```

Or memoize:

```tsx
const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
```

### "Node type not found"

**Cause**: Node's `type` doesn't match any key in `nodeTypes` (case-sensitive).

**Fix**: Ensure the type string matches exactly:

```tsx
// Node data
{ id: '1', type: 'textUpdater', ... }

// nodeTypes must have matching key
const nodeTypes = { textUpdater: TextUpdaterNode }; // not 'TextUpdater' or 'text-updater'
```

### Zustand context warning / "useStore must be used within a Provider"

**Causes**:
1. Two versions of `@xyflow/react` installed (check `package-lock.json`)
2. Using React Flow hooks outside `<ReactFlowProvider>`

**Fix 1**: Remove `node_modules` and `package-lock.json`, reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Fix 2**: Wrap with provider:

```tsx
<ReactFlowProvider>
  <Flow />
  <Sidebar /> {/* hooks work here now */}
</ReactFlowProvider>
```

## Edge issues

### Edges not displaying at all

**Possible causes and fixes**:

1. **Missing stylesheet**: Import `@xyflow/react/dist/style.css`
2. **No handles on custom nodes**: Edges need `<Handle>` components to connect to
3. **External CSS overriding edges**: Check for CSS rules hiding SVG elements
4. **Handle IDs not matching**: If using `sourceHandle`/`targetHandle`, ensure they match handle `id` props

### Edges display in wrong position

**Possible causes and fixes**:

1. **Handles use `display: none`**: Switch to `opacity: 0` or `visibility: hidden`
2. **Multiple handles without IDs**: Assign unique `id` props to each handle
3. **Handle positions changed dynamically**: Call `updateNodeInternals(nodeId)` after changes
4. **Missing position props in custom edge**: Pass `sourcePosition` and `targetPosition` to path functions

```tsx
// CORRECT
const [edgePath] = getBezierPath({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, // include these!
});
```

### Edges render behind nodes

**Cause**: Default behavior. Edges connected to child nodes in sub-flows render above nodes.

**Fix**: Set `zIndex` on edges or use `elevateEdgesOnSelect`:

```tsx
<ReactFlow elevateEdgesOnSelect={true} ... />
```

## Handle issues

### "Handle ID not found"

**Cause**: Multiple handles of the same type without unique `id` props, or dynamic handles not refreshed.

**Fix**:

```tsx
<Handle type="source" position={Position.Right} id="output-a" />
<Handle type="source" position={Position.Right} id="output-b" />
```

After dynamic handle changes:

```tsx
const updateNodeInternals = useUpdateNodeInternals();
updateNodeInternals(nodeId);
```

### Handle outside node context

**Cause**: `<Handle>` component used outside a custom node.

**Fix**: Only use `<Handle>` inside custom node components registered in `nodeTypes`.

## Interaction issues

### Cannot interact with inputs/buttons inside nodes

**Cause**: Node drag handler captures all mouse events.

**Fix**: Add `className="nodrag"` to interactive elements:

```tsx
<input type="text" className="nodrag" />
<button className="nodrag">Click me</button>
<select className="nodrag"><option>A</option></select>
```

### Cannot scroll inside a node

**Cause**: Scroll events are captured for viewport zoom.

**Fix**: Add `className="nowheel"` to scrollable containers:

```tsx
<div className="nodrag nowheel" style={{ overflow: 'auto', maxHeight: 200 }}>
  {/* scrollable content */}
</div>
```

### Canvas mouse events have wrong coordinates

**Cause**: React Flow uses CSS transforms for zoom; raw `clientX`/`clientY` are in screen space.

**Fix**: Use `screenToFlowPosition` for coordinate conversion:

```tsx
const { screenToFlowPosition } = useReactFlow();

const onPaneClick = (event) => {
  const flowPosition = screenToFlowPosition({
    x: event.clientX,
    y: event.clientY,
  });
  // flowPosition is in flow coordinates
};
```

## State issues

### State updates don't reflect in nodes

**Cause**: Mutating state instead of creating new objects.

**Fix**: Always create new objects with spread operator:

```tsx
// WRONG — mutation
const node = nodes.find((n) => n.id === id);
node.data.label = 'Updated';
setNodes(nodes);

// CORRECT — new object
setNodes((nodes) =>
  nodes.map((n) =>
    n.id === id ? { ...n, data: { ...n.data, label: 'Updated' } } : n,
  ),
);
```

### Sub-flow children render behind parent

**Cause**: Parent nodes must appear before children in the `nodes` array.

**Fix**: Sort nodes so parents come first:

```tsx
const nodes = [
  { id: 'parent', type: 'group', ... },  // parent FIRST
  { id: 'child', parentId: 'parent', ... }, // child AFTER
];
```

### `extent: 'parent'` warning on non-child nodes

**Cause**: Using `extent: 'parent'` on a node without a `parentId`.

**Fix**: Either add `parentId` or remove `extent`.

## Build issues

### Webpack 4 build errors

**Cause**: React Flow uses modern JavaScript that webpack 4 doesn't transpile.

**Fix**: Add babel-loader config:

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        include: /node_modules\/@xyflow/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              '@babel/plugin-proposal-optional-chaining',
              '@babel/plugin-proposal-nullish-coalescing-operator',
            ],
          },
        },
      },
    ],
  },
};
```

### SSR / Server-Side Rendering issues

React Flow requires DOM APIs. For Next.js App Router, add the `'use client'` directive at the top of the file containing your flow:

```tsx
'use client';

import { ReactFlow } from '@xyflow/react';
// ...
```

For Next.js Pages Router or when you need to fully skip SSR:

```tsx
import dynamic from 'next/dynamic';

const Flow = dynamic(() => import('./Flow'), { ssr: false });
```

Or use `useEffect` to delay rendering:

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

## Debugging tools

### React Flow debug mode

```tsx
<ReactFlow debug={true} ... />
```

Logs internal state changes to the console.

### React Flow DevTools

Install the React Flow DevTools browser extension for visual debugging of nodes, edges, and viewport state.

### Common debug pattern

```tsx
const { getNodes, getEdges, getViewport } = useReactFlow();

useEffect(() => {
  console.log('Nodes:', getNodes());
  console.log('Edges:', getEdges());
  console.log('Viewport:', getViewport());
});
```

## Quick diagnostic checklist

1. Is `@xyflow/react/dist/style.css` imported?
2. Does the parent container have explicit width and height?
3. Are `nodeTypes`/`edgeTypes` defined outside the component?
4. Are all three handlers wired up (`onNodesChange`, `onEdgesChange`, `onConnect`)?
5. Do custom nodes include `<Handle>` components?
6. Do interactive elements inside nodes have `className="nodrag"`?
7. Are multiple handles of the same type given unique `id`s?
8. Are state updates creating new objects (not mutating)?
9. Do parent nodes appear before children in the array?
10. Is `<ReactFlowProvider>` wrapping components that use hooks?
