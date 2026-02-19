# Fundamentals

## When to use this reference

Use this file when setting up a new React Flow project, building a first flow, or understanding the core node/edge data model.

## Contents

- [Installation](#installation)
- [Minimal flow setup](#minimal-flow-setup)
- [Node object structure](#node-object-structure)
- [Edge object structure](#edge-object-structure)
- [Built-in node types](#built-in-node-types)
- [Built-in edge types](#built-in-edge-types)
- [Controlled vs. uncontrolled flows](#controlled-vs-uncontrolled-flows)
- [The viewport](#the-viewport)

## Installation

```bash
npm install @xyflow/react
```

Always import the stylesheet — without it, nodes and edges will not render correctly:

```tsx
import '@xyflow/react/dist/style.css';
```

For custom styling frameworks (Tailwind, styled-components), import only base styles:

```tsx
import '@xyflow/react/dist/base.css';
```

## Minimal flow setup

```tsx
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' }, type: 'input' },
  { id: '2', position: { x: 200, y: 100 }, data: { label: 'Node 2' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2' },
];

export default function App() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

**Critical**: The parent `<div>` must have explicit width and height. Without this, nothing renders.

## Node object structure

Required fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `position` | `{ x: number, y: number }` | Position on the canvas |
| `data` | `Record<string, unknown>` | Arbitrary data passed to the node component |

Key optional fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `'default'` | Node type key matching `nodeTypes` |
| `hidden` | `boolean` | `false` | Hide node from canvas |
| `selected` | `boolean` | `false` | Selection state |
| `draggable` | `boolean` | `true` | Whether node can be dragged |
| `selectable` | `boolean` | `true` | Whether node can be selected |
| `connectable` | `boolean` | `true` | Whether handles accept connections |
| `deletable` | `boolean` | `true` | Whether node can be deleted |
| `dragHandle` | `string` | — | CSS selector for drag handle element |
| `parentId` | `string` | — | Parent node ID for sub-flows |
| `extent` | `CoordinateExtent \| 'parent'` | — | Movement boundary |
| `expandParent` | `boolean` | `false` | Auto-expand parent when dragged to edge |
| `zIndex` | `number` | — | Stacking order |
| `sourcePosition` | `Position` | `Position.Bottom` | Default source handle position |
| `targetPosition` | `Position` | `Position.Top` | Default target handle position |
| `style` | `CSSProperties` | — | Inline styles for the node wrapper |
| `className` | `string` | — | CSS class for the node wrapper |
| `ariaLabel` | `string` | — | Accessibility label |

Note: `width` and `height` are read-only (calculated by React Flow). Use `initialWidth` and `initialHeight` to set dimensions before measurement.

## Edge object structure

Required fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `source` | `string` | Source node ID |
| `target` | `string` | Target node ID |

Key optional fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `'default'` | Edge type key matching `edgeTypes` |
| `sourceHandle` | `string \| null` | — | Source handle ID (for multiple handles) |
| `targetHandle` | `string \| null` | — | Target handle ID (for multiple handles) |
| `animated` | `boolean` | `false` | Animate the edge |
| `hidden` | `boolean` | `false` | Hide edge from canvas |
| `selected` | `boolean` | `false` | Selection state |
| `selectable` | `boolean` | `true` | Whether edge can be selected |
| `deletable` | `boolean` | `true` | Whether edge can be deleted |
| `reconnectable` | `boolean \| HandleType` | `true` | Whether edge can be reconnected |
| `label` | `ReactNode` | — | Edge label content |
| `labelStyle` | `CSSProperties` | — | Label text styles |
| `labelShowBg` | `boolean` | `true` | Show background behind label |
| `labelBgStyle` | `CSSProperties` | — | Label background styles |
| `labelBgPadding` | `[number, number]` | — | Label background padding |
| `labelBgBorderRadius` | `number` | — | Label background border radius |
| `markerStart` | `EdgeMarkerType` | — | Start marker (arrow, etc.) |
| `markerEnd` | `EdgeMarkerType` | — | End marker (arrow, etc.) |
| `interactionWidth` | `number` | `20` | Invisible interaction area width |
| `style` | `CSSProperties` | — | Edge SVG styles |
| `className` | `string` | — | CSS class |
| `zIndex` | `number` | — | Stacking order |

## Built-in node types

| Type | Description |
|------|-------------|
| `'default'` | One source handle (bottom), one target handle (top) |
| `'input'` | One source handle only (starting node) |
| `'output'` | One target handle only (ending node) |
| `'group'` | No handles, used as a container for sub-flows |

## Built-in edge types

| Type | Description |
|------|-------------|
| `'default'` | Bezier curve |
| `'straight'` | Straight line |
| `'step'` | Right-angle step path |
| `'smoothstep'` | Rounded step path |
| `'simplebezier'` | Simple bezier curve |

## Controlled vs. uncontrolled flows

### Controlled (recommended for any non-trivial app)

You manage `nodes` and `edges` in state and handle all changes:

```tsx
import { useState, useCallback } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

export default function Flow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    />
  );
}
```

### Uncontrolled (simple demos only)

React Flow manages state internally. Use `defaultNodes` / `defaultEdges` instead of `nodes` / `edges`:

```tsx
<ReactFlow
  defaultNodes={initialNodes}
  defaultEdges={initialEdges}
  defaultEdgeOptions={{ animated: true }}
  fitView
/>
```

To modify an uncontrolled flow programmatically, use the `useReactFlow` hook:

```tsx
const { addNodes } = useReactFlow();
addNodes({ id: 'new', position: { x: 0, y: 0 }, data: { label: 'New' } });
```

## The viewport

The viewport is the visible area of the canvas. Users can pan (drag) and zoom (scroll/pinch).

Key viewport props on `<ReactFlow>`:

| Prop | Default | Description |
|------|---------|-------------|
| `defaultViewport` | `{ x: 0, y: 0, zoom: 1 }` | Initial viewport position |
| `fitView` | `false` | Auto-fit all nodes on mount |
| `minZoom` | `0.5` | Minimum zoom level |
| `maxZoom` | `2` | Maximum zoom level |
| `preventScrolling` | `true` | Prevent page scroll over flow |
| `translateExtent` | `[[-Infinity, -Infinity], [Infinity, Infinity]]` | Pan boundary |
| `nodeExtent` | — | Node placement boundary |
| `snapToGrid` | `false` | Snap nodes to grid on drag |
| `snapGrid` | `[15, 15]` | Grid size for snapping |

## Do / Don't

- Do import `@xyflow/react/dist/style.css` in every project.
- Do set explicit width/height on the parent container.
- Do use controlled flows for applications with user interaction.
- Don't define `nodeTypes` or `edgeTypes` inside a component render function.
- Don't mutate nodes or edges directly — always create new objects.
- Don't use `defaultNodes`/`defaultEdges` alongside `nodes`/`edges` — pick one pattern.
