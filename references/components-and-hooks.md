# Components and Hooks

## When to use this reference

Use this file when working with React Flow's built-in UI components (Background, Controls, MiniMap, Panel, etc.), hooks, or the ReactFlowProvider.

## Contents

- [ReactFlowProvider](#reactflowprovider)
- [Built-in components](#built-in-components)
- [Hooks reference](#hooks-reference)
- [ReactFlowInstance methods](#reactflowinstance-methods)
- [Controlled viewport](#controlled-viewport)
- [Pan to a specific node](#pan-to-a-specific-node)
- [Check viewport initialization](#check-viewport-initialization)

## ReactFlowProvider

Required when:
- Using hooks like `useReactFlow` outside the `<ReactFlow>` component
- Multiple flows on the same page
- Client-side routing with flow state

```tsx
import { ReactFlowProvider } from '@xyflow/react';

function App() {
  return (
    <ReactFlowProvider>
      <Flow />
      <Sidebar /> {/* Can use useReactFlow here */}
    </ReactFlowProvider>
  );
}
```

**Rule**: The provider must wrap the component containing `<ReactFlow>`, not be inside it.

## Built-in components

### Background

Renders a pattern background behind the flow:

```tsx
import { Background, BackgroundVariant } from '@xyflow/react';

<ReactFlow ...>
  <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#aaa" />
</ReactFlow>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `BackgroundVariant` | `Dots` | `Dots`, `Lines`, or `Cross` |
| `gap` | `number \| [number, number]` | `20` | Grid gap size |
| `size` | `number` | `1` | Dot size or line stroke width |
| `color` | `string` | — | Pattern color |
| `lineWidth` | `number` | `1` | Line width (Lines/Cross) |
| `offset` | `number` | `0` | Pattern offset |

### Controls

Renders zoom and fit-view buttons:

```tsx
import { Controls } from '@xyflow/react';

<ReactFlow ...>
  <Controls showZoom showFitView showInteractive position="bottom-left" />
</ReactFlow>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showZoom` | `boolean` | `true` | Show zoom in/out buttons |
| `showFitView` | `boolean` | `true` | Show fit-view button |
| `showInteractive` | `boolean` | `true` | Show interactive toggle |
| `position` | `PanelPosition` | `'bottom-left'` | Position on canvas |
| `onZoomIn` | `() => void` | — | Custom zoom in handler |
| `onZoomOut` | `() => void` | — | Custom zoom out handler |
| `onFitView` | `() => void` | — | Custom fit view handler |
| `onInteractiveChange` | `(interactive: boolean) => void` | — | Toggle handler |
| `fitViewOptions` | `FitViewOptions` | — | Options for fit view |
| `orientation` | `'horizontal' \| 'vertical'` | `'vertical'` | Button layout |

### ControlButton

Add custom buttons to the Controls panel:

```tsx
import { Controls, ControlButton } from '@xyflow/react';

<Controls>
  <ControlButton onClick={handleSave} title="Save">
    <SaveIcon />
  </ControlButton>
</Controls>
```

### MiniMap

Renders a small overview map:

```tsx
import { MiniMap } from '@xyflow/react';

<ReactFlow ...>
  <MiniMap
    nodeStrokeColor="#000"
    nodeColor={(node) => node.type === 'input' ? '#0041d0' : '#ff0072'}
    maskColor="rgba(0, 0, 0, 0.1)"
    pannable
    zoomable
  />
</ReactFlow>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodeColor` | `string \| (node) => string` | `'#e2e2e2'` | Node fill color |
| `nodeStrokeColor` | `string \| (node) => string` | `'transparent'` | Node stroke color |
| `nodeStrokeWidth` | `number` | `2` | Node stroke width |
| `nodeBorderRadius` | `number` | `5` | Node border radius |
| `maskColor` | `string` | `'rgb(240, 240, 240, 0.6)'` | Viewport mask color |
| `maskStrokeColor` | `string` | `'none'` | Viewport mask stroke |
| `maskStrokeWidth` | `number` | `1` | Viewport mask stroke width |
| `pannable` | `boolean` | `false` | Pan viewport via minimap |
| `zoomable` | `boolean` | `false` | Zoom viewport via minimap |
| `position` | `PanelPosition` | `'bottom-right'` | Position on canvas |
| `inversePan` | `boolean` | `false` | Invert pan direction |
| `zoomStep` | `number` | `10` | Zoom step on scroll |

### Panel

Renders a positioned panel on the canvas:

```tsx
import { Panel } from '@xyflow/react';

<ReactFlow ...>
  <Panel position="top-left">
    <button onClick={onSave}>Save</button>
    <button onClick={onRestore}>Restore</button>
  </Panel>
</ReactFlow>
```

| Position | Description |
|----------|-------------|
| `'top-left'` | Top left corner |
| `'top-center'` | Top center |
| `'top-right'` | Top right corner |
| `'bottom-left'` | Bottom left corner |
| `'bottom-center'` | Bottom center |
| `'bottom-right'` | Bottom right corner |

### NodeToolbar

Renders a toolbar attached to a node (visible when selected):

```tsx
import { NodeToolbar, Position } from '@xyflow/react';

function CustomNode({ data }) {
  return (
    <>
      <NodeToolbar position={Position.Top} isVisible>
        <button>Copy</button>
        <button>Delete</button>
      </NodeToolbar>
      <div>{data.label}</div>
    </>
  );
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `Position` | `Position.Top` | Side of node |
| `isVisible` | `boolean` | — | Force visibility (overrides selection) |
| `offset` | `number` | `10` | Distance from node |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | Alignment along edge |

### NodeResizer / NodeResizeControl

Make nodes resizable:

```tsx
import { NodeResizer } from '@xyflow/react';

function ResizableNode({ data, selected }) {
  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={30}
        isVisible={selected}
        color="#ff0071"
      />
      <div>{data.label}</div>
    </>
  );
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `minWidth` | `number` | `10` | Minimum width |
| `minHeight` | `number` | `10` | Minimum height |
| `maxWidth` | `number` | `Infinity` | Maximum width |
| `maxHeight` | `number` | `Infinity` | Maximum height |
| `isVisible` | `boolean` | `true` | Show resize handles |
| `color` | `string` | — | Handle color |
| `handleStyle` | `CSSProperties` | — | Handle styles |
| `lineStyle` | `CSSProperties` | — | Border line styles |
| `keepAspectRatio` | `boolean` | `false` | Maintain aspect ratio |

`NodeResizeControl` provides a single resize control (e.g., bottom-right only).

### ViewportPortal

Renders elements in the viewport coordinate system (affected by zoom and pan, like nodes and edges). Use this to render custom content that moves and scales with the flow:

```tsx
import { ViewportPortal } from '@xyflow/react';

<ReactFlow ...>
  <ViewportPortal>
    <div style={{ position: 'absolute', transform: 'translate(100px, 200px)' }}>
      This content is positioned in flow coordinates
    </div>
  </ViewportPortal>
</ReactFlow>
```

**Note**: For fixed overlays that are *not* affected by zoom/pan, use `<Panel>` instead.

## Hooks reference

### State access hooks

| Hook | Returns | Re-renders on change? |
|------|---------|-----------------------|
| `useReactFlow()` | `ReactFlowInstance` | No — reads on demand |
| `useNodes()` | `Node[]` | Yes — every node change |
| `useEdges()` | `Edge[]` | Yes — every edge change |
| `useNodesState(initial)` | `[nodes, setNodes, onNodesChange]` | Yes |
| `useEdgesState(initial)` | `[edges, setEdges, onEdgesChange]` | Yes |
| `useViewport()` | `{ x, y, zoom }` | Yes — every viewport change |

### Node-specific hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useNodeId()` | `string` | Current node's ID (use inside custom nodes) |
| `useNodesData(ids)` | `NodeData[]` | Data for specific node IDs |
| `useNodesInitialized()` | `boolean` | True after all nodes are measured |
| `useInternalNode(id)` | `InternalNode` | Internal node with computed bounds |
| `useUpdateNodeInternals()` | `(id) => void` | Refresh node after handle changes |

### Connection hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useConnection()` | `ConnectionState` | Active connection state during drag |
| `useHandleConnections({ type, id? })` | `HandleConnection[]` | Connections for a specific handle (**deprecated** — use `useNodeConnections`) |
| `useNodeConnections({ handleType?, handleId? })` | `NodeConnection[]` | All connections for the current node |

### Event hooks

| Hook | Parameters | Description |
|------|-----------|-------------|
| `useOnSelectionChange({ onChange })` | `{ nodes, edges }` | Called when selection changes |
| `useOnViewportChange({ onStart?, onChange?, onEnd? })` | `Viewport` | Called during viewport changes |
| `useKeyPress(keyCode)` | Returns `boolean` | Track key press state |

### Store hooks

| Hook | Returns | Description |
|------|---------|-------------|
| `useStore(selector)` | Selected state | Subscribe to specific store slices |
| `useStoreApi()` | `StoreApi` | Direct store access (no subscription) |

### useStore selector pattern

Use selectors to avoid re-rendering on unrelated state changes:

```tsx
// BAD: re-renders on ANY store change
const state = useStore((s) => s);

// GOOD: only re-renders when node count changes
const nodeCount = useStore((s) => s.nodes.length);

// GOOD: custom equality check
const selectedIds = useStore(
  (s) => s.nodes.filter((n) => n.selected).map((n) => n.id),
  // Zustand shallow comparison
  shallow,
);
```

## ReactFlowInstance methods

Accessed via `useReactFlow()`. See `references/state-management.md` for full patterns.

### Node methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getNodes()` | `() => Node[]` | Get all nodes |
| `getNode(id)` | `(id: string) => Node \| undefined` | Get node by ID |
| `setNodes(nodes)` | `(Node[] \| (Node[]) => Node[]) => void` | Set all nodes |
| `addNodes(nodes)` | `(Node \| Node[]) => void` | Add nodes |
| `updateNode(id, update)` | `(id, Partial<Node> \| (Node) => Partial<Node>) => void` | Update node |
| `updateNodeData(id, data)` | `(id, data \| (Node) => data) => void` | Update node data |
| `deleteElements(opts)` | `(DeleteElementsOptions) => Promise<DeletedElements>` | Delete elements |

### Edge methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getEdges()` | `() => Edge[]` | Get all edges |
| `getEdge(id)` | `(id: string) => Edge \| undefined` | Get edge by ID |
| `setEdges(edges)` | `(Edge[] \| (Edge[]) => Edge[]) => void` | Set all edges |
| `addEdges(edges)` | `(Edge \| Edge[]) => void` | Add edges |
| `updateEdge(id, update)` | `(id, Partial<Edge>) => void` | Update edge |
| `updateEdgeData(id, data)` | `(id, data) => void` | Update edge data |

### Viewport methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `fitView(options?)` | `(FitViewOptions?) => Promise<boolean>` | Fit viewport to nodes |
| `zoomIn(options?)` | `(TransitionOptions?) => Promise<boolean>` | Zoom in |
| `zoomOut(options?)` | `(TransitionOptions?) => Promise<boolean>` | Zoom out |
| `zoomTo(level, options?)` | `(number, TransitionOptions?) => Promise<boolean>` | Zoom to level |
| `setViewport(viewport, options?)` | `(Viewport, TransitionOptions?) => Promise<boolean>` | Set viewport |
| `getViewport()` | `() => Viewport` | Get viewport |
| `getZoom()` | `() => number` | Get zoom level |
| `setCenter(x, y, options?)` | `(x, y, {zoom?, duration?}) => Promise<boolean>` | Center on point |
| `fitBounds(rect, options?)` | `(Rect, {padding?, duration?}) => Promise<boolean>` | Fit to rectangle |

### Coordinate conversion

| Method | Signature | Description |
|--------|-----------|-------------|
| `screenToFlowPosition(pos)` | `(XYPosition) => XYPosition` | Screen pixels to flow coordinates |
| `flowToScreenPosition(pos)` | `(XYPosition) => XYPosition` | Flow coordinates to screen pixels |

### Intersection methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getIntersectingNodes(node, partially?)` | `(Node \| Rect, boolean?) => Node[]` | Find intersecting nodes |
| `isNodeIntersecting(node, area, partially?)` | `(Node \| Rect, Rect, boolean?) => boolean` | Check intersection |

### Utility methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `toObject()` | `() => { nodes, edges, viewport }` | Serialize flow state |
| `getNodesBounds(nodes)` | `(Node[] \| string[]) => Rect` | Get bounding box |
| `getHandleConnections({ type, nodeId, id? })` | Returns `HandleConnection[]` | Get handle connections |
| `getNodeConnections({ handleType?, nodeId, handleId? })` | Returns `NodeConnection[]` | Get node connections |

## Controlled viewport

Control the viewport directly through state instead of letting React Flow manage it:

```tsx
const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

<ReactFlow
  viewport={viewport}
  onViewportChange={setViewport}
  ...
/>
```

## Pan to a specific node

```tsx
function PanToNode() {
  const { getNode, setCenter } = useReactFlow();

  const panTo = (nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      const x = node.position.x + (node.measured?.width ?? 0) / 2;
      const y = node.position.y + (node.measured?.height ?? 0) / 2;
      setCenter(x, y, { zoom: 1.5, duration: 500 });
    }
  };

  return <button onClick={() => panTo('node-1')}>Focus Node 1</button>;
}
```

## Check viewport initialization

Guard viewport methods until the viewport is ready:

```tsx
const { viewportInitialized, fitView } = useReactFlow();

const safeFitView = () => {
  if (viewportInitialized) fitView({ padding: 0.2, duration: 300 });
};
```

## Do / Don't

- Do wrap your flow component tree in `<ReactFlowProvider>` when using hooks outside `<ReactFlow>`.
- Do use `useStore` with selectors to minimize re-renders.
- Do use `useReactFlow` instead of `useNodes`/`useEdges` in event handlers and callbacks.
- Don't use `useNodes()` or `useEdges()` in performance-sensitive components — they re-render on every change.
- Don't call hooks outside a `<ReactFlowProvider>` context.
