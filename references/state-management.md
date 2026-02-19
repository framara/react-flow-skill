# State Management

## When to use this reference

Use this file when choosing between controlled and uncontrolled flows, integrating React Flow with Zustand or other state libraries, or updating node/edge state from within custom components.

## Contents

- [State management approaches](#state-management-approaches)
- [Approach 1: useState with apply helpers](#approach-1-usestate-with-apply-helpers)
- [Approach 2: useNodesState / useEdgesState hooks](#approach-2-usenodesstate--useedgesstate-hooks)
- [Approach 3: Zustand store (recommended for production)](#approach-3-zustand-store-recommended-for-production)
- [Immutability requirement](#immutability-requirement)
- [Using useReactFlow for programmatic updates](#using-usereactflow-for-programmatic-updates)
- [Computing flows (data processing)](#computing-flows-data-processing)
- [Serialization and persistence](#serialization-and-persistence)

## State management approaches

| Approach | Best for | Complexity |
|----------|----------|------------|
| `useState` + `applyChanges` | Simple flows, demos | Low |
| `useNodesState` / `useEdgesState` | Quick prototypes | Low |
| Zustand store | Production apps, shared state | Medium |
| Redux / Jotai / Recoil | Existing app integration | Medium-High |

## Approach 1: useState with apply helpers

The standard controlled flow pattern:

```tsx
import { useState, useCallback } from 'react';
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

**Limitation**: Updating nodes from within custom node components requires prop drilling callbacks through `data`.

## Approach 2: useNodesState / useEdgesState hooks

Convenience hooks that bundle state + change handler:

```tsx
import { ReactFlow, useNodesState, useEdgesState, addEdge } from '@xyflow/react';

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

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

**Note**: Same limitation as `useState` — still local to the component.

## Approach 3: Zustand store (recommended for production)

React Flow uses Zustand internally, making it a natural fit. This pattern eliminates prop drilling — custom nodes access state directly.

### Store definition

```tsx
import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect } from '@xyflow/react';

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
};

const useFlowStore = create<FlowState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },
  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },
  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          // IMPORTANT: create new object — mutations are not detected
          return { ...node, data: { ...node.data, ...data } };
        }
        return node;
      }),
    });
  },
}));

export default useFlowStore;
```

### Flow component

```tsx
import { ReactFlow } from '@xyflow/react';
import useFlowStore from './store';

const nodeTypes = { custom: CustomNode };

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
    />
  );
}
```

### Custom node accessing store

```tsx
import { Handle, Position, useNodeId } from '@xyflow/react';
import useFlowStore from './store';

function CustomNode({ data }) {
  const id = useNodeId();
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <input
        type="color"
        defaultValue={data.color}
        onChange={(e) => updateNodeData(id, { color: e.target.value })}
        className="nodrag"
      />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

## Immutability requirement

React Flow detects changes by reference comparison. Always create new objects:

```tsx
// CORRECT — new object created
set({
  nodes: get().nodes.map((node) =>
    node.id === id ? { ...node, data: { ...node.data, label: 'Updated' } } : node,
  ),
});

// WRONG — mutation not detected
const node = get().nodes.find((n) => n.id === id);
node.data.label = 'Updated'; // mutation!
set({ nodes: get().nodes });
```

## Using useReactFlow for programmatic updates

The `useReactFlow` hook provides methods that automatically trigger the correct change handlers:

```tsx
const { setNodes, addNodes, updateNode, updateNodeData, deleteElements } = useReactFlow();

// Update a single node
updateNode('node-1', { position: { x: 100, y: 200 } });

// Update just node data
updateNodeData('node-1', { label: 'New Label' });

// Add nodes
addNodes([{ id: 'new', position: { x: 0, y: 0 }, data: { label: 'New' } }]);

// Delete elements
await deleteElements({ nodes: [{ id: 'node-1' }] });
```

**Key advantage**: `useReactFlow` does NOT cause re-renders when state changes — it reads state on demand.

## Computing flows (data processing)

For flows that compute/transform data through connected nodes:

### Pattern: Store data in nodes, read from connections

```tsx
import { useEffect } from 'react';
import { useNodeConnections, useNodesData, useReactFlow } from '@xyflow/react';

function ProcessorNode({ id, data }) {
  const { updateNodeData } = useReactFlow();

  // Get connected source nodes
  const connections = useNodeConnections({ handleType: 'target' });
  const connectedData = useNodesData(connections.map((c) => c.source));

  // Compute output when inputs change
  useEffect(() => {
    const sum = connectedData.reduce((acc, d) => acc + (d?.data?.value ?? 0), 0);
    updateNodeData(id, { result: sum });
  }, [connectedData, id, updateNodeData]);

  return <div>Result: {data.result}</div>;
}
```

### Important: Don't use node data as form state

For input fields, maintain local state separately from node data:

```tsx
function InputNode({ id, data }) {
  const [value, setValue] = useState(data.value ?? 0);
  const { updateNodeData } = useReactFlow();

  // Sync to node data on change, but use local state for the input
  const onChange = (e) => {
    const v = Number(e.target.value);
    setValue(v);
    updateNodeData(id, { value: v });
  };

  return <input type="number" value={value} onChange={onChange} className="nodrag" />;
}
```

## Serialization and persistence

### Saving flow state

```tsx
const { toObject } = useReactFlow();

const saveFlow = () => {
  const flowData = toObject(); // { nodes, edges, viewport }
  localStorage.setItem('flow', JSON.stringify(flowData));
};
```

### Restoring flow state

```tsx
const { setNodes, setEdges, setViewport } = useReactFlow();

const restoreFlow = () => {
  const data = JSON.parse(localStorage.getItem('flow'));
  if (data) {
    setNodes(data.nodes);
    setEdges(data.edges);
    setViewport(data.viewport);
  }
};
```

## Do / Don't

- Do use Zustand for any app where custom nodes need to update shared state.
- Do create new objects when updating node/edge state — never mutate.
- Do use `useReactFlow` for programmatic updates that don't need to trigger re-renders.
- Do maintain local state for form inputs inside nodes, syncing to node data on change.
- Don't prop-drill callbacks through node `data` — use a shared store instead.
- Don't read `nodes` or `edges` arrays directly from the store in components that don't need them (causes unnecessary re-renders).
