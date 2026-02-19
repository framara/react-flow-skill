# Interactivity

## When to use this reference

Use this file when configuring event handlers, connection validation, selection behavior, keyboard shortcuts, or any user interaction with the flow.

## Contents

- [Core interaction handlers](#core-interaction-handlers)
- [Default interactive capabilities](#default-interactive-capabilities)
- [Node event handlers](#node-event-handlers)
- [Edge event handlers](#edge-event-handlers)
- [Connection event handlers](#connection-event-handlers)
- [Pane event handlers](#pane-event-handlers)
- [Selection event handlers](#selection-event-handlers)
- [Viewport event handlers](#viewport-event-handlers)
- [Deletion handlers](#deletion-handlers)
- [Interaction toggle props](#interaction-toggle-props)
- [Keyboard configuration](#keyboard-configuration)
- [Connection line customization](#connection-line-customization)
- [Custom connection line](#custom-connection-line)
- [Drag and drop from external source](#drag-and-drop-from-external-source)
- [Error handling](#error-handling)

## Core interaction handlers

A controlled flow needs three handlers for basic interactivity:

```tsx
import { useCallback, useState } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

function Flow() {
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

Without `onNodesChange`, nodes snap back after dragging. Without `onConnect`, connection lines appear but edges are never created.

## Default interactive capabilities

With the three core handlers wired up, users get:

- Selectable nodes and edges (click)
- Draggable nodes
- Connectable nodes (drag from handles)
- Multi-selection via Shift + click
- Multi-selection via Shift + drag (selection box)
- Remove selected elements via Backspace/Delete

## Node event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onNodeClick` | `(event, node) => void` | Node clicked |
| `onNodeDoubleClick` | `(event, node) => void` | Node double-clicked |
| `onNodeContextMenu` | `(event, node) => void` | Node right-clicked |
| `onNodeDragStart` | `(event, node, nodes) => void` | Drag starts |
| `onNodeDrag` | `(event, node, nodes) => void` | During drag |
| `onNodeDragStop` | `(event, node, nodes) => void` | Drag ends |
| `onNodeMouseEnter` | `(event, node) => void` | Mouse enters node |
| `onNodeMouseMove` | `(event, node) => void` | Mouse moves over node |
| `onNodeMouseLeave` | `(event, node) => void` | Mouse leaves node |
| `onNodesDelete` | `(nodes) => void` | Nodes deleted |
| `onNodesChange` | `(changes) => void` | Any node change (required for controlled flow) |

## Edge event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onEdgeClick` | `(event, edge) => void` | Edge clicked |
| `onEdgeDoubleClick` | `(event, edge) => void` | Edge double-clicked |
| `onEdgeContextMenu` | `(event, edge) => void` | Edge right-clicked |
| `onEdgeMouseEnter` | `(event, edge) => void` | Mouse enters edge |
| `onEdgeMouseMove` | `(event, edge) => void` | Mouse moves over edge |
| `onEdgeMouseLeave` | `(event, edge) => void` | Mouse leaves edge |
| `onEdgesDelete` | `(edges) => void` | Edges deleted |
| `onEdgesChange` | `(changes) => void` | Any edge change (required for controlled flow) |

## Connection event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onConnect` | `(connection) => void` | Two nodes successfully connected |
| `onConnectStart` | `(event, params) => void` | Connection drag begins |
| `onConnectEnd` | `(event, connectionState) => void` | Connection drag ends (valid or not) |
| `onClickConnectStart` | `(event, params) => void` | Click-based connection starts |
| `onClickConnectEnd` | `(event) => void` | Click-based connection ends |
| `isValidConnection` | `(connection) => boolean` | Validate before allowing connection |

### Connection validation

```tsx
const isValidConnection = useCallback(
  (connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    // Prevent duplicate edges
    const exists = edges.some(
      (e) => e.source === connection.source && e.target === connection.target,
    );
    return !exists;
  },
  [edges],
);

<ReactFlow isValidConnection={isValidConnection} ... />
```

### Handling dropped connections (connecting to empty space)

```tsx
const onConnectEnd = useCallback(
  (event, connectionState) => {
    if (!connectionState.isValid) {
      // Connection was dropped on empty canvas — create a new node here
      const { clientX, clientY } = 'changedTouches' in event ? event.changedTouches[0] : event;
      const position = screenToFlowPosition({ x: clientX, y: clientY });
      const newNode = {
        id: `node-${Date.now()}`,
        position,
        data: { label: 'New Node' },
      };
      setNodes((nds) => [...nds, newNode]);
      setEdges((eds) => [
        ...eds,
        { id: `e-${Date.now()}`, source: connectionState.fromNode.id, target: newNode.id },
      ]);
    }
  },
  [screenToFlowPosition],
);
```

## Pane event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onPaneClick` | `(event) => void` | Click on empty canvas |
| `onPaneContextMenu` | `(event) => void` | Right-click on empty canvas |
| `onPaneScroll` | `(event) => void` | Scroll over canvas |
| `onPaneMouseMove` | `(event) => void` | Mouse move over canvas |
| `onPaneMouseEnter` | `(event) => void` | Mouse enters canvas |
| `onPaneMouseLeave` | `(event) => void` | Mouse leaves canvas |

## Selection event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onSelectionChange` | `({ nodes, edges }) => void` | Selection changes |
| `onSelectionDragStart` | `(event, nodes) => void` | Selection box drag starts |
| `onSelectionDrag` | `(event, nodes) => void` | During selection box drag |
| `onSelectionDragStop` | `(event, nodes) => void` | Selection box drag ends |
| `onSelectionContextMenu` | `(event, nodes) => void` | Right-click on selection |

## Viewport event handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onMoveStart` | `(event, viewport) => void` | Pan/zoom starts |
| `onMove` | `(event, viewport) => void` | During pan/zoom |
| `onMoveEnd` | `(event, viewport) => void` | Pan/zoom ends |

## Deletion handlers

| Prop | Signature | Description |
|------|-----------|-------------|
| `onDelete` | `({ nodes, edges }) => void` | After elements deleted |
| `onBeforeDelete` | `({ nodes, edges }) => Promise<boolean \| { nodes: Node[]; edges: Edge[] }>` | Before deletion — return `false` to cancel, or return a modified `{ nodes, edges }` for selective deletion |

### Preventing deletion of specific nodes

```tsx
const onBeforeDelete = useCallback(async ({ nodes, edges }) => {
  // Prevent deleting the root node
  const hasRoot = nodes.some((n) => n.id === 'root');
  if (hasRoot) return false;
  return true;
}, []);
```

Or set `deletable: false` on individual nodes/edges:

```tsx
{ id: 'root', data: { label: 'Root' }, position: { x: 0, y: 0 }, deletable: false }
```

## Interaction toggle props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodesDraggable` | `boolean` | `true` | All nodes draggable |
| `nodesConnectable` | `boolean` | `true` | All nodes connectable |
| `nodesFocusable` | `boolean` | `true` | Tab key cycles focus between nodes |
| `edgesFocusable` | `boolean` | `true` | Tab key cycles focus between edges |
| `elementsSelectable` | `boolean` | `true` | Click to select |
| `autoPanOnConnect` | `boolean` | `true` | Viewport pans during connection |
| `autoPanOnNodeDrag` | `boolean` | `true` | Viewport pans during drag |
| `panOnDrag` | `boolean \| number[]` | `true` | Enable panning; `[1]` = middle mouse only |
| `panOnScroll` | `boolean` | `false` | Scroll to pan instead of zoom |
| `zoomOnScroll` | `boolean` | `true` | Scroll wheel zooms |
| `zoomOnPinch` | `boolean` | `true` | Pinch gesture zooms |
| `zoomOnDoubleClick` | `boolean` | `true` | Double-click zooms |
| `selectNodesOnDrag` | `boolean` | `true` | Select nodes when dragging |
| `selectionOnDrag` | `boolean` | `false` | Drag creates selection box without modifier key |
| `selectionMode` | `'full' \| 'partial'` | `'full'` | `'partial'` selects nodes partially in box |
| `connectOnClick` | `boolean` | `true` | Click handles to connect (not just drag) |
| `connectionMode` | `'strict' \| 'loose'` | `'strict'` | `'loose'` allows source-to-source connections |
| `elevateNodesOnSelect` | `boolean` | `true` | Raise z-index of selected nodes |
| `elevateEdgesOnSelect` | `boolean` | `false` | Raise z-index of selected edges |

## Keyboard configuration

| Prop | Default | Description |
|------|---------|-------------|
| `deleteKeyCode` | `'Backspace'` | Delete selected elements |
| `selectionKeyCode` | `'Shift'` | Hold to draw selection box |
| `multiSelectionKeyCode` | `'Meta'` (Mac) / `'Control'` (Win) | Hold to multi-select |
| `zoomActivationKeyCode` | `'Meta'` (Mac) / `'Control'` (Win) | Hold to enable zoom |
| `panActivationKeyCode` | `'Space'` | Hold to enable panning |

Set any key code to `null` to disable that keyboard shortcut.

## Connection line customization

| Prop | Type | Description |
|------|------|-------------|
| `connectionLineStyle` | `CSSProperties` | Style for the in-progress connection line |
| `connectionLineType` | `ConnectionLineType` | Path type (`'default'`, `'straight'`, `'step'`, `'smoothstep'`, `'simplebezier'`) |
| `connectionRadius` | `number` | Snap radius around target handles |
| `connectionLineComponent` | `React.ComponentType` | Custom connection line component |

## Custom connection line

Override the default connection line shown while dragging:

```tsx
import { ConnectionLineComponentProps, getSmoothStepPath } from '@xyflow/react';

function CustomConnectionLine({
  fromX, fromY, fromPosition,
  toX, toY, toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getSmoothStepPath({
    sourceX: fromX, sourceY: fromY, sourcePosition: fromPosition,
    targetX: toX, targetY: toY, targetPosition: toPosition,
  });

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={connectionStatus === 'valid' ? '#22c55e' : '#ef4444'}
        strokeWidth={2}
        strokeDasharray="5 5"
      />
    </g>
  );
}

<ReactFlow connectionLineComponent={CustomConnectionLine} ... />
```

## Drag and drop from external source

Add nodes by dragging from a sidebar:

```tsx
function DnDFlow() {
  const { screenToFlowPosition, addNodes } = useReactFlow();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    addNodes({ id: `${Date.now()}`, type, position, data: { label: `${type} node` } });
  }, [screenToFlowPosition, addNodes]);

  return <ReactFlow onDragOver={onDragOver} onDrop={onDrop} ... />;
}

// Sidebar
function Sidebar() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <div draggable onDragStart={(e) => onDragStart(e, 'custom')}>Custom Node</div>
    </aside>
  );
}
```

## Error handling

```tsx
const onError = useCallback((code: string, message: string) => {
  console.error(`React Flow Error [${code}]:`, message);
}, []);

<ReactFlow onError={onError} ... />
```

## Do / Don't

- Do wire up all three core handlers (`onNodesChange`, `onEdgesChange`, `onConnect`) for controlled flows.
- Do memoize event handler callbacks with `useCallback`.
- Do use `isValidConnection` for connection rules rather than post-hoc cleanup.
- Don't forget that `onConnectEnd` fires regardless of connection validity — check `connectionState.isValid`.
- Don't set keyboard codes to `undefined` — use `null` to disable them.
