# Custom Nodes

## When to use this reference

Use this file when creating custom node components, configuring handles, or building interactive elements inside nodes. The React Flow team recommends custom nodes over built-in types for any real application.

## Contents

- [Creating a custom node](#creating-a-custom-node)
- [Props injected into custom nodes](#props-injected-into-custom-nodes)
- [Handle component](#handle-component)
- [Interactive elements inside nodes](#interactive-elements-inside-nodes)
- [Drag handles](#drag-handles)
- [Connection mode](#connection-mode)

## Creating a custom node

### Step 1: Define the component

Custom nodes receive props automatically injected by React Flow:

```tsx
import { Handle, Position } from '@xyflow/react';

function ColorPickerNode({ id, data, isConnectable }) {
  return (
    <div className="color-picker-node">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} />
      <div>
        <label htmlFor={`color-${id}`}>Color:</label>
        <input
          id={`color-${id}`}
          type="color"
          defaultValue={data.color}
          className="nodrag"
        />
      </div>
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} />
    </div>
  );
}

export default ColorPickerNode;
```

### Step 2: Register the node type (outside the component!)

```tsx
// CORRECT: defined outside component body
const nodeTypes = { colorPicker: ColorPickerNode };

function App() {
  return <ReactFlow nodeTypes={nodeTypes} ... />;
}
```

```tsx
// WRONG: causes re-renders and warnings
function App() {
  const nodeTypes = { colorPicker: ColorPickerNode }; // re-created every render!
  return <ReactFlow nodeTypes={nodeTypes} ... />;
}
```

If node types must be dynamic, use `useMemo`:

```tsx
const nodeTypes = useMemo(() => ({ colorPicker: ColorPickerNode }), []);
```

### Step 3: Use the type in node data

```tsx
const nodes = [
  {
    id: '1',
    type: 'colorPicker',
    position: { x: 0, y: 0 },
    data: { color: '#ff0000' },
  },
];
```

## Props injected into custom nodes

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Node ID |
| `data` | `T` | The node's `data` object |
| `type` | `string` | Node type string |
| `selected` | `boolean` | Whether the node is selected |
| `isConnectable` | `boolean` | Whether the node allows connections |
| `zIndex` | `number` | Current z-index |
| `positionAbsoluteX` | `number` | Absolute X position |
| `positionAbsoluteY` | `number` | Absolute Y position |
| `dragging` | `boolean` | Whether node is being dragged |
| `dragHandle` | `string` | Drag handle selector |
| `sourcePosition` | `Position` | Default source handle position |
| `targetPosition` | `Position` | Default target handle position |
| `parentId` | `string` | Parent node ID (sub-flows) |
| `width` | `number` | Measured width |
| `height` | `number` | Measured height |

## Handle component

The `<Handle>` component creates connection points on nodes.

### Basic usage

```tsx
import { Handle, Position } from '@xyflow/react';

<Handle type="target" position={Position.Top} />
<Handle type="source" position={Position.Bottom} />
```

### Handle props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'source' \| 'target'` | — | Handle direction |
| `position` | `Position` | — | Side of node (`Top`, `Right`, `Bottom`, `Left`) |
| `id` | `string` | — | Required when multiple handles of same type |
| `isConnectable` | `boolean` | `true` | Allow connections |
| `isConnectableStart` | `boolean` | `true` | Allow starting connections from this handle |
| `isConnectableEnd` | `boolean` | `true` | Allow ending connections at this handle |
| `onConnect` | `(connection) => void` | — | Called when connection is made to this handle |
| `style` | `CSSProperties` | — | Inline styles |
| `className` | `string` | — | CSS class |

### Multiple handles

When a node has multiple handles of the same type, each must have a unique `id`:

```tsx
function MultiHandleNode() {
  return (
    <div>
      <Handle type="source" position={Position.Right} id="output-a" />
      <Handle type="source" position={Position.Right} id="output-b" style={{ top: '75%' }} />
      <Handle type="target" position={Position.Left} id="input" />
    </div>
  );
}
```

Reference handles in edges using `sourceHandle` and `targetHandle`:

```tsx
const edges = [
  { id: 'e1', source: 'node1', sourceHandle: 'output-a', target: 'node2' },
  { id: 'e2', source: 'node1', sourceHandle: 'output-b', target: 'node3' },
];
```

### Custom handle appearance

Wrap any element with `<Handle>` and hide the default appearance:

```tsx
<Handle
  type="source"
  position={Position.Right}
  style={{ background: 'none', border: 'none', width: '1.5em', height: '1.5em' }}
>
  <PlusIcon style={{ pointerEvents: 'none', fontSize: '1.5em' }} />
</Handle>
```

**Critical**: Set `pointerEvents: 'none'` on children so the handle receives click/drag events.

### Hiding handles

Use `visibility: hidden` or `opacity: 0` — **never** `display: none`:

```css
/* CORRECT */
.react-flow__handle { opacity: 0; }

/* WRONG — breaks dimension calculation */
.react-flow__handle { display: none; }
```

### Dynamic handles

When programmatically adding or removing handles, refresh node internals:

```tsx
import { useUpdateNodeInternals } from '@xyflow/react';

function DynamicNode({ id }) {
  const updateNodeInternals = useUpdateNodeInternals();

  const addHandle = () => {
    // ... add handle to state
    updateNodeInternals(id);
  };
}
```

### Handle validation styling

Handles receive CSS classes during connection:

| Class | When |
|-------|------|
| `connecting` | Connection line is over the handle |
| `valid` | Connection would be valid |

```css
.react-flow__handle.connecting { background: orange; }
.react-flow__handle.valid { background: green; }
```

## Interactive elements inside nodes

Interactive elements (inputs, buttons, selects, textareas) need special class names to prevent conflicts with node dragging and viewport zoom:

| Class | Effect |
|-------|--------|
| `nodrag` | Prevents node dragging when interacting with element |
| `nowheel` | Prevents viewport zoom on scroll (for scrollable elements) |
| `nopan` | Prevents viewport panning |

```tsx
<input type="text" className="nodrag" />
<select className="nodrag"><option>A</option></select>
<div className="nodrag nowheel" style={{ overflow: 'auto', maxHeight: 200 }}>
  {/* scrollable content */}
</div>
```

## Drag handles

Restrict dragging to a specific element using the `dragHandle` property:

```tsx
const nodes = [
  {
    id: '1',
    type: 'custom',
    data: { label: 'Drag me by the header' },
    dragHandle: '.drag-handle',
    position: { x: 0, y: 0 },
  },
];

function CustomNode({ data }) {
  return (
    <div>
      <div className="drag-handle">Drag here</div>
      <div>Content (not draggable)</div>
    </div>
  );
}
```

## Connection mode

By default, source handles only connect to target handles (`connectionMode="strict"`). Set `connectionMode="loose"` on `<ReactFlow>` to allow connections between any handle types:

```tsx
<ReactFlow connectionMode="loose" ... />
```

## Do / Don't

- Do use custom nodes for anything beyond the simplest prototypes.
- Do apply `nodrag` to all interactive form elements inside nodes.
- Do give unique `id`s to multiple handles of the same type.
- Do use `pointerEvents: 'none'` on custom handle child elements.
- Don't define `nodeTypes` inside a render function.
- Don't use `display: none` to hide handles.
- Don't forget to call `updateNodeInternals` after dynamic handle changes.
