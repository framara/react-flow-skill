# Custom Edges

## When to use this reference

Use this file when creating custom edge components, adding interactive edge labels, using edge markers (arrows), or building custom SVG paths for edges.

## Contents

- [Creating a custom edge](#creating-a-custom-edge)
- [Props injected into custom edges](#props-injected-into-custom-edges)
- [Path generation utilities](#path-generation-utilities)
- [Custom SVG paths](#custom-svg-paths)
- [Edge labels with EdgeLabelRenderer](#edge-labels-with-edgelabelrenderer)
- [Edge toolbar](#edge-toolbar)
- [Edge markers (arrows)](#edge-markers-arrows)
- [Edge reconnection](#edge-reconnection)
- [Default edge options](#default-edge-options)
- [Animated edges](#animated-edges)

## Creating a custom edge

### Step 1: Define the component

Custom edges receive coordinate and data props from React Flow:

```tsx
import { BaseEdge, getStraightPath } from '@xyflow/react';

function CustomEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  return <BaseEdge id={id} path={edgePath} />;
}

export default CustomEdge;
```

### Step 2: Register the edge type (outside the component!)

```tsx
const edgeTypes = { custom: CustomEdge };

function App() {
  return <ReactFlow edgeTypes={edgeTypes} ... />;
}
```

### Step 3: Use the type in edge data

```tsx
const edges = [
  { id: 'e1', source: '1', target: '2', type: 'custom' },
];
```

## Props injected into custom edges

| Prop | Type | Description |
|------|------|-------------|
| `id` | `string` | Edge ID |
| `source` | `string` | Source node ID |
| `target` | `string` | Target node ID |
| `sourceX` | `number` | Source handle X coordinate |
| `sourceY` | `number` | Source handle Y coordinate |
| `targetX` | `number` | Target handle X coordinate |
| `targetY` | `number` | Target handle Y coordinate |
| `sourcePosition` | `Position` | Source handle position (Top/Right/Bottom/Left) |
| `targetPosition` | `Position` | Target handle position |
| `sourceHandleId` | `string \| null` | Source handle ID |
| `targetHandleId` | `string \| null` | Target handle ID |
| `data` | `T` | Custom edge data |
| `selected` | `boolean` | Whether the edge is selected |
| `animated` | `boolean` | Whether the edge is animated |
| `markerStart` | `string` | Start marker URL |
| `markerEnd` | `string` | End marker URL |
| `style` | `CSSProperties` | Edge styles |
| `interactionWidth` | `number` | Invisible interaction area width |
| `label` | `ReactNode` | Edge label |

## Path generation utilities

React Flow provides four functions that return `[path, labelX, labelY, offsetX, offsetY]`:

| Function | Description | Best for |
|----------|-------------|----------|
| `getBezierPath` | Smooth bezier curve | Default curved edges |
| `getSimpleBezierPath` | Simpler bezier curve | Less pronounced curves |
| `getSmoothStepPath` | Rounded right-angle path | Step-based layouts |
| `getStraightPath` | Direct straight line | Simple connections |

### Usage pattern

```tsx
import { BaseEdge, getBezierPath } from '@xyflow/react';

function BezierEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
  });

  return <BaseEdge id={id} path={edgePath} />;
}
```

### getSmoothStepPath options

```tsx
const [edgePath] = getSmoothStepPath({
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  borderRadius: 8,   // corner rounding (default: 5)
  offset: 25,        // spacing from nodes
});
```

## Custom SVG paths

Build paths manually using SVG path commands:

| Command | Syntax | Description |
|---------|--------|-------------|
| `M` | `M x y` | Move to coordinate |
| `L` | `L x y` | Line to coordinate |
| `Q` | `Q cx cy x y` | Quadratic bezier (cx,cy = control point) |
| `C` | `C cx1 cy1 cx2 cy2 x y` | Cubic bezier |

```tsx
function WavyEdge({ id, sourceX, sourceY, targetX, targetY }) {
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const edgePath = `M ${sourceX} ${sourceY} Q ${midX} ${midY - 50} ${targetX} ${targetY}`;

  return <BaseEdge id={id} path={edgePath} />;
}
```

## Edge labels with EdgeLabelRenderer

For interactive or complex edge labels, use `<EdgeLabelRenderer>`:

```tsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

function LabeledEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button onClick={() => data?.onDelete?.(id)}>Delete</button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

**Key patterns for EdgeLabelRenderer:**
- Use `position: absolute` on the label container
- Use `transform: translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` for positioning
- Add `pointerEvents: 'all'` to make labels interactive
- Add `className="nodrag nopan"` for interactive elements

## Edge toolbar

`<EdgeToolbar>` renders a toolbar near the edge (appears when edge is selected):

```tsx
import { BaseEdge, EdgeToolbar, getBezierPath } from '@xyflow/react';

function ToolbarEdge(props) {
  const [edgePath] = getBezierPath(props);

  return (
    <>
      <BaseEdge id={props.id} path={edgePath} />
      <EdgeToolbar>
        <button>Edit</button>
        <button>Delete</button>
      </EdgeToolbar>
    </>
  );
}
```

## Edge markers (arrows)

### Using built-in markers

```tsx
import { MarkerType } from '@xyflow/react';

const edges = [
  {
    id: 'e1',
    source: '1',
    target: '2',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  {
    id: 'e2',
    source: '2',
    target: '3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#FF0000',
      width: 20,
      height: 20,
    },
    markerStart: { type: MarkerType.Arrow },
  },
];
```

### MarkerType options

| Type | Description |
|------|-------------|
| `MarkerType.Arrow` | Open arrowhead |
| `MarkerType.ArrowClosed` | Filled arrowhead |

### Marker properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `MarkerType` | Arrow style |
| `color` | `string` | Marker color |
| `width` | `number` | Marker width |
| `height` | `number` | Marker height |
| `orient` | `string` | Marker orientation |
| `strokeWidth` | `number` | Stroke width |

### Default marker color

Set a global default via the `<ReactFlow>` component:

```tsx
<ReactFlow defaultMarkerColor="#b1b1b7" ... />
```

## Edge reconnection

Allow users to detach and reconnect edges by dragging their endpoints:

```tsx
import { reconnectEdge } from '@xyflow/react';

const onReconnect = useCallback(
  (oldEdge, newConnection) => {
    setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
  },
  [],
);

<ReactFlow
  edgesReconnectable={true}
  onReconnect={onReconnect}
  reconnectRadius={10}
  ...
/>
```

## Default edge options

Apply defaults to all new edges created via connections:

```tsx
const defaultEdgeOptions = {
  type: 'smoothstep',
  animated: true,
  style: { stroke: '#FF0000' },
  markerEnd: { type: MarkerType.ArrowClosed },
};

<ReactFlow defaultEdgeOptions={defaultEdgeOptions} ... />
```

## Animated edges

### Dash animation with CSS keyframes

```tsx
function DashEdge({ id, ...props }: EdgeProps) {
  const [edgePath] = getBezierPath(props);
  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ strokeDasharray: '5 5', animation: 'dashdraw 0.5s linear infinite' }}
    />
  );
}
```

```css
@keyframes dashdraw {
  to { stroke-dashoffset: -10; }
}
```

### Moving circle along path

```tsx
function MovingCircleEdge({ id, ...props }: EdgeProps) {
  const [edgePath] = getBezierPath(props);
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <circle r="4" fill="#ff0072">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
```

### SVG text along path

```tsx
function TextPathEdge({ id, data, ...props }: EdgeProps) {
  const [edgePath] = getBezierPath(props);
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <text>
        <textPath href={`#${id}`} startOffset="50%" textAnchor="middle" style={{ fontSize: 12 }}>
          {data?.label}
        </textPath>
      </text>
    </>
  );
}
```

## Do / Don't

- Do use `<BaseEdge>` and path utilities for standard edge rendering.
- Do use `<EdgeLabelRenderer>` for interactive edge labels with buttons/inputs.
- Do pass `sourcePosition` and `targetPosition` to path functions for correct curvature.
- Don't define `edgeTypes` inside a render function.
- Don't forget `pointerEvents: 'all'` on interactive edge label containers.
- Don't forget `className="nodrag nopan"` on interactive elements inside edge labels.
