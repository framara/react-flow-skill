# Performance and Styling

## When to use this reference

Use this file when optimizing React Flow for large graphs, reducing re-renders, configuring themes, or integrating with CSS frameworks like Tailwind.

## Contents

- [Performance optimization](#performance-optimization)
- [Theming](#theming)
- [Tailwind CSS integration](#tailwind-css-integration)
- [Accessibility](#accessibility)

## Performance optimization

### 1. Memoize custom node and edge components

Custom components re-render whenever any node/edge changes unless memoized:

```tsx
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomNode = memo(function CustomNode({ data }) {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <span>{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

export default CustomNode;
```

### 2. Stable nodeTypes and edgeTypes references

Define outside components or memoize:

```tsx
// BEST: outside component
const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

// OK: memoized
const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);
```

### 3. Memoize callback props

```tsx
const onNodeClick = useCallback((event, node) => {
  console.log('clicked', node.id);
}, []);

const defaultEdgeOptions = useMemo(
  () => ({ animated: true, style: { stroke: '#ff0000' } }),
  [],
);

const snapGrid = useMemo(() => [15, 15] as [number, number], []);

<ReactFlow
  onNodeClick={onNodeClick}
  defaultEdgeOptions={defaultEdgeOptions}
  snapGrid={snapGrid}
  ...
/>
```

### 4. Avoid full state subscriptions

Reading the entire `nodes` or `edges` array causes re-renders on every change:

```tsx
// BAD: re-renders whenever ANY node changes
const nodes = useStore((state) => state.nodes);
const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);

// GOOD: only re-renders when selection actually changes
const selectedNodeIds = useStore(
  (state) => state.nodes.filter((n) => n.selected).map((n) => n.id),
  shallow, // import from zustand/shallow
);
```

Use `useReactFlow()` for on-demand reads that don't need reactive updates:

```tsx
const { getNodes, getEdges } = useReactFlow();

const handleSave = () => {
  const currentNodes = getNodes(); // no subscription, no re-render
};
```

### 5. Only render visible elements

For very large graphs, enable viewport culling:

```tsx
<ReactFlow onlyRenderVisibleElements={true} ... />
```

This skips rendering nodes and edges outside the visible viewport.

### 6. Collapse large node trees

Use the `hidden` property to toggle visibility of subtrees:

```tsx
const toggleChildren = (parentId) => {
  // Read current nodes once to use in both updates
  const currentNodes = getNodes();
  const childIds = new Set(
    currentNodes.filter((n) => n.parentId === parentId).map((n) => n.id),
  );

  setNodes((nodes) =>
    nodes.map((node) =>
      childIds.has(node.id) ? { ...node, hidden: !node.hidden } : node,
    ),
  );
  setEdges((edges) =>
    edges.map((edge) => {
      const isChild = childIds.has(edge.source) || childIds.has(edge.target);
      return isChild ? { ...edge, hidden: !edge.hidden } : edge;
    }),
  );
};
```

### 7. Simplify node styles

Complex CSS (shadows, gradients, animations, backdrop-filter) significantly impacts performance with hundreds of nodes. For large graphs:

- Remove `box-shadow` and `filter` effects
- Avoid CSS animations on nodes
- Use solid colors instead of gradients
- Minimize border-radius complexity

### 8. Decouple presentation state from flow state

Track UI concerns (selection, hover, focus) separately from the flow data to prevent cascading re-renders:

```tsx
// In your Zustand store
type UIState = {
  selectedNodeIds: Set<string>;
  hoveredNodeId: string | null;
};
```

## Theming

### Color mode

React Flow supports light, dark, and system color modes:

```tsx
<ReactFlow colorMode="dark" ... />
```

| Value | Description |
|-------|-------------|
| `'light'` | Light theme (default) |
| `'dark'` | Dark theme |
| `'system'` | Match OS preference |

This adds a class to the `.react-flow` container (`dark` or `light`) for conditional CSS.

### CSS variables

Override default styles by setting CSS variables on `.react-flow` or `:root`:

```css
.react-flow {
  /* Node defaults */
  --xy-node-background-color-default: #fff;
  --xy-node-border-default: 1px solid #1a192b;
  --xy-node-border-radius-default: 3px;
  --xy-node-color-default: #222;
  --xy-node-boxshadow-hover-default: 0 1px 4px 1px rgba(0, 0, 0, 0.08);
  --xy-node-boxshadow-selected-default: 0 0 0 0.5px #1a192b;

  /* Handle defaults */
  --xy-handle-background-color-default: #1a192b;
  --xy-handle-border-color-default: #fff;

  /* Edge defaults */
  --xy-edge-stroke-default: #b1b1b7;
  --xy-edge-stroke-width-default: 1;
  --xy-edge-stroke-selected-default: #555;

  /* Selection */
  --xy-selection-background-color-default: rgba(0, 89, 220, 0.08);
  --xy-selection-border-default: 1px dotted rgba(0, 89, 220, 0.8);

  /* Connection line */
  --xy-connectionline-stroke-default: #b1b1b7;
  --xy-connectionline-stroke-width-default: 1;

  /* Attribution */
  --xy-attribution-background-color-default: rgba(255, 255, 255, 0.5);

  /* Controls */
  --xy-controls-button-background-color-default: #fefefe;
  --xy-controls-button-background-color-hover-default: #f4f4f4;
  --xy-controls-button-color-default: inherit;
  --xy-controls-button-color-hover-default: inherit;
  --xy-controls-button-border-color-default: #eee;

  /* MiniMap */
  --xy-minimap-background-color-default: #fff;
  --xy-minimap-mask-background-color-default: rgb(240, 240, 240, 0.6);
  --xy-minimap-mask-stroke-color-default: transparent;
  --xy-minimap-node-background-color-default: #e2e2e2;
  --xy-minimap-node-stroke-color-default: transparent;

  /* Background */
  --xy-background-pattern-color-default: #81818a;
  --xy-background-color-default: #fff;
}
```

### Dark theme example

```css
.react-flow.dark {
  --xy-node-background-color-default: #1e1e1e;
  --xy-node-border-default: 1px solid #444;
  --xy-node-color-default: #eee;
  --xy-edge-stroke-default: #666;
  --xy-background-color-default: #121212;
  --xy-background-pattern-color-default: #333;
  --xy-controls-button-background-color-default: #2a2a2a;
  --xy-controls-button-border-color-default: #444;
  --xy-minimap-background-color-default: #1e1e1e;
}
```

### CSS class targets

| Selector | Target |
|----------|--------|
| `.react-flow` | Root container |
| `.react-flow__node` | All nodes |
| `.react-flow__node-default` | Default node type |
| `.react-flow__node-input` | Input node type |
| `.react-flow__node-output` | Output node type |
| `.react-flow__node-group` | Group node type |
| `.react-flow__node.selected` | Selected nodes |
| `.react-flow__edge` | All edges |
| `.react-flow__edge.selected` | Selected edges |
| `.react-flow__edge-path` | Edge SVG path |
| `.react-flow__handle` | Handles |
| `.react-flow__handle-top` | Top-positioned handles |
| `.react-flow__handle-right` | Right-positioned handles |
| `.react-flow__handle-bottom` | Bottom-positioned handles |
| `.react-flow__handle-left` | Left-positioned handles |
| `.react-flow__connection` | Connection line |
| `.react-flow__controls` | Controls container |
| `.react-flow__minimap` | MiniMap container |
| `.react-flow__background` | Background container |
| `.react-flow__panel` | Panel container |
| `.react-flow__attribution` | Attribution link |

### Inline styles via style prop

```tsx
<ReactFlow
  style={{ background: '#1a1a2e', width: '100%', height: 300 }}
  ...
/>
```

## Tailwind CSS integration

### Setup

Import only base styles (not the full stylesheet):

```tsx
import '@xyflow/react/dist/base.css';
```

### Custom node with Tailwind

```tsx
import { Handle, Position } from '@xyflow/react';

function TailwindNode({ data }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold">{data.name}</div>
          <div className="text-gray-500">{data.role}</div>
        </div>
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="w-16 !bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-16 !bg-teal-500"
      />
    </div>
  );
}
```

**Note**: Use `!` prefix (important modifier) to override React Flow's default handle styles (e.g., `!bg-teal-500`).

### Utility CSS classes

React Flow provides utility classes for custom node content:

| Class | Effect |
|-------|--------|
| `nodrag` | Prevents node drag on the element |
| `nowheel` | Prevents zoom on scroll |
| `nopan` | Prevents viewport pan |

These can be combined with Tailwind classes:

```tsx
<input className="nodrag border rounded px-2 py-1" />
```

## Accessibility

### Built-in features

- Nodes and edges are focusable with Tab key
- Arrow keys move selected nodes
- Enter/Space activates selection
- Escape deselects

### Configuration

```tsx
<ReactFlow
  nodesFocusable={true}        // Tab cycles through nodes
  edgesFocusable={true}        // Tab cycles through edges
  disableKeyboardA11y={false}  // Keep keyboard navigation
  ariaLabelConfig={{
    // Customize ARIA labels
  }}
  ...
/>
```

### Custom node accessibility

```tsx
const nodes = [
  {
    id: '1',
    data: { label: 'Start' },
    position: { x: 0, y: 0 },
    ariaLabel: 'Start node - beginning of the workflow',
  },
];
```

## Do / Don't

- Do memoize custom node/edge components with `React.memo`.
- Do memoize `nodeTypes`, `edgeTypes`, callback props, and object props.
- Do use `onlyRenderVisibleElements` for flows with 100+ nodes.
- Do import `base.css` instead of `style.css` when using Tailwind.
- Do use CSS variables for theme customization.
- Don't subscribe to full `nodes`/`edges` arrays in components that only need a subset.
- Don't apply complex CSS effects (shadows, animations) to nodes in large graphs.
- Don't forget the `!` modifier in Tailwind when overriding React Flow default styles.
