# TypeScript

## When to use this reference

Use this file when setting up TypeScript types for React Flow, creating typed custom nodes/edges, or using generic hooks and callbacks.

## Contents

- [Core type imports](#core-type-imports)
- [Typing nodes](#typing-nodes)
- [Typing edges](#typing-edges)
- [Typing callbacks](#typing-callbacks)
- [Typing hooks](#typing-hooks)
- [Type guards](#type-guards)
- [Complete typed flow example](#complete-typed-flow-example)
- [Typing Zustand stores](#typing-zustand-stores)
- [Common type mistakes](#common-type-mistakes)

## Core type imports

```tsx
import {
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodeDrag,
  type FitViewOptions,
  type DefaultEdgeOptions,
  type BuiltInNode,
  type BuiltInEdge,
  type Connection,
  type Viewport,
  type XYPosition,
  type ReactFlowInstance,
} from '@xyflow/react';
```

## Typing nodes

### Basic node typing

```tsx
const initialNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
];
```

### Custom node types

Define a custom node type with specific data shape and type discriminator:

```tsx
// The second generic parameter is the type discriminator string
type NumberNode = Node<{ value: number }, 'number'>;
type TextNode = Node<{ text: string }, 'text'>;

// Union type for all node types in your app
type AppNode = BuiltInNode | NumberNode | TextNode;
```

**Important**: Use `type` keyword, not `interface`. TypeScript interfaces don't work with union type discriminators in React Flow.

### Typed custom node component

```tsx
import { type NodeProps, Handle, Position } from '@xyflow/react';

type NumberNodeData = { value: number };
type NumberNode = Node<NumberNodeData, 'number'>;

function NumberNode({ data }: NodeProps<NumberNode>) {
  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <span>{data.value}</span>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

## Typing edges

### Custom edge types

```tsx
type WeightedEdge = Edge<{ weight: number }, 'weighted'>;

// Union type for all edge types
type AppEdge = BuiltInEdge | WeightedEdge;
```

### Typed custom edge component

```tsx
import { type EdgeProps, BaseEdge, getBezierPath } from '@xyflow/react';

type WeightedEdge = Edge<{ weight: number }, 'weighted'>;

function WeightedEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<WeightedEdge>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <text>{data?.weight}</text>
    </>
  );
}
```

## Typing callbacks

### OnNodesChange

```tsx
const onNodesChange: OnNodesChange<AppNode> = useCallback(
  (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
  [setNodes],
);
```

### OnEdgesChange

```tsx
const onEdgesChange: OnEdgesChange<AppEdge> = useCallback(
  (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
  [setEdges],
);
```

### OnConnect

```tsx
const onConnect: OnConnect = useCallback(
  (connection) => setEdges((eds) => addEdge(connection, eds)),
  [setEdges],
);
```

### OnNodeDrag with type narrowing

```tsx
const onNodeDrag: OnNodeDrag<AppNode> = useCallback((event, node) => {
  if (node.type === 'number') {
    console.log(node.data.value); // Type-safe: TypeScript knows this is NumberNode
  }
}, []);
```

## Typing hooks

### useReactFlow

```tsx
const reactFlow = useReactFlow<AppNode, AppEdge>();

// All methods are now typed
const nodes: AppNode[] = reactFlow.getNodes();
const node: AppNode | undefined = reactFlow.getNode('1');
```

### useStore with typed selectors

```tsx
import { type ReactFlowState } from '@xyflow/react';

const nodes = useStore((state: ReactFlowState<AppNode>) => state.nodes);
```

### useNodesData

```tsx
const nodesData = useNodesData<AppNode>(nodeIds);
// Returns typed data for each node
```

## Type guards

Create type guard functions for safe runtime type narrowing:

```tsx
function isNumberNode(node: AppNode): node is NumberNode {
  return node.type === 'number';
}

function isTextNode(node: AppNode): node is TextNode {
  return node.type === 'text';
}

// Usage
const numberNodes = nodes.filter(isNumberNode); // Type: NumberNode[]
```

## Complete typed flow example

```tsx
import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type BuiltInNode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Define custom node types
type ColorNode = Node<{ color: string; label: string }, 'color'>;
type AppNode = BuiltInNode | ColorNode;
type AppEdge = Edge;

// Custom node component
function ColorNodeComponent({ data }: NodeProps<ColorNode>) {
  return (
    <div style={{ background: data.color, padding: 10 }}>
      {data.label}
    </div>
  );
}

// Define outside component
const nodeTypes = { color: ColorNodeComponent };

const initialNodes: AppNode[] = [
  { id: '1', type: 'color', position: { x: 0, y: 0 }, data: { color: '#ff0000', label: 'Red' } },
  { id: '2', type: 'color', position: { x: 200, y: 100 }, data: { color: '#0000ff', label: 'Blue' } },
];

const initialEdges: AppEdge[] = [
  { id: 'e1-2', source: '1', target: '2' },
];

export default function TypedFlow() {
  const [nodes, setNodes] = useState<AppNode[]>(initialNodes);
  const [edges, setEdges] = useState<AppEdge[]>(initialEdges);

  const onNodesChange: OnNodesChange<AppNode> = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange<AppEdge> = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [],
  );

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <ReactFlow<AppNode, AppEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

## Typing Zustand stores

```tsx
import { create } from 'zustand';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';

type FlowState = {
  nodes: AppNode[];
  edges: AppEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<AppEdge>;
  onConnect: OnConnect;
  setNodes: (nodes: AppNode[]) => void;
  setEdges: (edges: AppEdge[]) => void;
};

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
  onConnect: (connection) => set({ edges: addEdge(connection, get().edges) }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
}));
```

## Common type mistakes

| Mistake | Fix |
|---------|-----|
| Using `interface` for node types | Use `type` — interfaces break union discriminators |
| Not passing generics to `<ReactFlow>` | Add `<ReactFlow<AppNode, AppEdge>>` for full type checking |
| Accessing `data` without type guard | Use type guard function or check `node.type` first |
| Using `any` for node data | Define specific data types per node type |

## Do / Don't

- Do use `type` (not `interface`) for custom node and edge type definitions.
- Do create a union type (`AppNode`, `AppEdge`) combining all custom types with `BuiltInNode`/`BuiltInEdge`.
- Do pass generic parameters to `useReactFlow`, `<ReactFlow>`, and callbacks.
- Do write type guard functions for runtime type narrowing.
- Don't use `any` or `unknown` for node/edge data — define proper types.
- Don't forget to type your Zustand store with the same union types.
