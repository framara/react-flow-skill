# Advanced Patterns

## When to use this reference

Use this file when implementing undo/redo, copy/paste, computed data flows, dynamic handles, save/restore, collaborative editing, or other advanced patterns that go beyond basic React Flow setup.

## Contents

- [Undo / redo](#undo--redo)
- [Copy / paste](#copy--paste)
- [Save and restore](#save-and-restore)
- [Computed flows (reactive data pipelines)](#computed-flows-reactive-data-pipelines)
- [Dynamic handle generation](#dynamic-handle-generation)
- [Connection validation and cycle prevention](#connection-validation-and-cycle-prevention)
- [Connection limits](#connection-limits)
- [Contextual zoom (level-of-detail rendering)](#contextual-zoom-level-of-detail-rendering)
- [Collaborative editing](#collaborative-editing)
- [Do / Don't](#do--dont)

## Undo / redo

Use a snapshot-based approach: capture `nodes` and `edges` state on each meaningful change, push snapshots to a history stack, and navigate back/forward through the stack.

### With Zustand + Zundo (recommended)

[Zundo](https://github.com/charkour/zundo) is a temporal middleware for Zustand that adds undo/redo automatically. Since React Flow already uses Zustand internally, this is the most natural fit.

```bash
npm install zustand zundo immer
```

```ts
import { create } from 'zustand';
import { temporal } from 'zundo';
import { immer } from 'zustand/middleware/immer';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';

type FlowState = {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
};

const useFlowStore = create<FlowState>()(
  temporal(
    immer((set, get) => ({
      nodes: [] as Node[],
      edges: [] as Edge[],
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
    })),
    {
      // Only track nodes and edges in history, not handler functions
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
      }),
    },
  ),
);

export default useFlowStore;
```

Wire up the keyboard shortcuts and undo/redo actions:

```tsx
import { useCallback, useEffect } from 'react';
import { ReactFlow } from '@xyflow/react';
import { useTemporalStore } from 'zundo';
import useFlowStore from './store';

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore();
  const { undo, redo } = useTemporalStore((state) => state);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

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

### Without Zundo (manual implementation)

If you prefer no extra dependency, manage history stacks directly:

```ts
import { useCallback, useRef } from 'react';
import { type Node, type Edge } from '@xyflow/react';

type Snapshot = { nodes: Node[]; edges: Edge[] };

export function useUndoRedo(maxHistory = 100) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const takeSnapshot = useCallback((nodes: Node[], edges: Edge[]) => {
    past.current = past.current.slice(-maxHistory);
    past.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    // Any new action clears the redo stack
    future.current = [];
  }, [maxHistory]);

  const undo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void,
    ) => {
      const previous = past.current.pop();
      if (!previous) return;
      future.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      });
      setNodes(previous.nodes);
      setEdges(previous.edges);
    },
    [],
  );

  const redo = useCallback(
    (
      currentNodes: Node[],
      currentEdges: Edge[],
      setNodes: (nodes: Node[]) => void,
      setEdges: (edges: Edge[]) => void,
    ) => {
      const next = future.current.pop();
      if (!next) return;
      past.current.push({
        nodes: structuredClone(currentNodes),
        edges: structuredClone(currentEdges),
      });
      setNodes(next.nodes);
      setEdges(next.edges);
    },
    [],
  );

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);

  return { takeSnapshot, undo, redo, canUndo, canRedo };
}
```

**When to call `takeSnapshot`**: Before node drag starts (`onNodeDragStart`), before deletion (`onBeforeDelete`), before connecting (`onConnect`), and before any programmatic state change. Do not snapshot on every intermediate drag position — that floods the history.

## Copy / paste

### Pattern: clipboard events with custom MIME type

Use the browser Clipboard API with a custom data type to avoid interfering with normal text copy/paste. Regenerate IDs on paste and offset positions so pasted nodes don't overlap originals. Remap edge source/target to the new IDs.

```tsx
import { useCallback, useRef } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';

let idCounter = 0;
const newId = () => `pasted_${Date.now()}_${idCounter++}`;

export function useCopyPaste() {
  const { getNodes, getEdges, setNodes, setEdges, screenToFlowPosition } =
    useReactFlow();
  const clipboard = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const copy = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    // Only copy edges where both source and target are selected
    const selectedEdges = getEdges().filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    clipboard.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(selectedEdges),
    };
  }, [getNodes, getEdges]);

  const cut = useCallback(() => {
    copy();
    const selected = getNodes().filter((n) => n.selected);
    const selectedIds = new Set(selected.map((n) => n.id));
    setNodes((nodes) => nodes.filter((n) => !selectedIds.has(n.id)));
    setEdges((edges) =>
      edges.filter(
        (e) => !selectedIds.has(e.source) && !selectedIds.has(e.target),
      ),
    );
  }, [copy, getNodes, setNodes, setEdges]);

  const paste = useCallback(
    (position?: { x: number; y: number }) => {
      if (!clipboard.current) return;

      const { nodes: copiedNodes, edges: copiedEdges } = clipboard.current;
      // Map old IDs to new IDs
      const idMap = new Map<string, string>();
      copiedNodes.forEach((n) => idMap.set(n.id, newId()));

      // Calculate offset: place relative to original centroid, shifted
      const offset = position
        ? (() => {
            const avgX =
              copiedNodes.reduce((sum, n) => sum + n.position.x, 0) /
              copiedNodes.length;
            const avgY =
              copiedNodes.reduce((sum, n) => sum + n.position.y, 0) /
              copiedNodes.length;
            return { x: position.x - avgX, y: position.y - avgY };
          })()
        : { x: 50, y: 50 };

      const newNodes = copiedNodes.map((n) => ({
        ...n,
        id: idMap.get(n.id)!,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        selected: true,
        dragging: false,
        ...(n.parentId && idMap.has(n.parentId)
          ? { parentId: idMap.get(n.parentId)! }
          : {}),
      }));

      const newEdges = copiedEdges.map((e) => ({
        ...e,
        id: newId(),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
      }));

      // Deselect all, then add pasted elements as selected
      setNodes((nodes) =>
        [...nodes.map((n) => ({ ...n, selected: false })), ...newNodes],
      );
      setEdges((edges) =>
        [...edges.map((e) => ({ ...e, selected: false })), ...newEdges],
      );
    },
    [setNodes, setEdges],
  );

  return { copy, cut, paste };
}
```

Wire up keyboard shortcuts:

```tsx
const { copy, cut, paste } = useCopyPaste();

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Skip if user is typing in an input
    if ((e.target as HTMLElement).closest('input, textarea, select')) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      copy();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
      cut();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
      paste();
    }
  };
  document.addEventListener('keydown', onKeyDown);
  return () => document.removeEventListener('keydown', onKeyDown);
}, [copy, cut, paste]);
```

## Save and restore

Use `toObject()` from `useReactFlow()` to serialize the entire flow (nodes, edges, viewport) and restore it later:

```tsx
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

function useSaveRestore(storageKey = 'react-flow-state') {
  const { toObject, setNodes, setEdges, setViewport } = useReactFlow();

  const save = useCallback(() => {
    const flow = toObject();
    localStorage.setItem(storageKey, JSON.stringify(flow));
  }, [toObject, storageKey]);

  const restore = useCallback(() => {
    const json = localStorage.getItem(storageKey);
    if (!json) return;

    const flow = JSON.parse(json);
    setNodes(flow.nodes || []);
    setEdges(flow.edges || []);

    const { x = 0, y = 0, zoom = 1 } = flow.viewport || {};
    setViewport({ x, y, zoom });
  }, [setNodes, setEdges, setViewport, storageKey]);

  return { save, restore };
}
```

`toObject()` returns a `ReactFlowJsonObject`:

```ts
interface ReactFlowJsonObject<NodeType, EdgeType> {
  nodes: NodeType[];
  edges: EdgeType[];
  viewport: { x: number; y: number; zoom: number };
}
```

This is JSON-serializable and works with `localStorage`, databases, or file exports.

## Computed flows (reactive data pipelines)

Build nodes that react to data from connected nodes. Three hooks work together:

| Hook | Purpose |
|------|---------|
| `useNodeConnections({ handleType })` | Discover which nodes are connected to a handle |
| `useNodesData(nodeIds)` | Subscribe to data changes on connected nodes |
| `updateNodeData(id, data)` | Write computed results back to the node |

### Input node (writes data)

```tsx
import { memo } from 'react';
import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react';

type TextNodeData = { text: string };

function TextNode({ id, data }: NodeProps<Node<TextNodeData>>) {
  const { updateNodeData } = useReactFlow();

  return (
    <div className="nodrag">
      <Handle type="source" position={Position.Right} />
      <input
        value={data.text}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />
    </div>
  );
}

export default memo(TextNode);
```

### Transform node (reads input, writes output)

```tsx
import { memo, useEffect } from 'react';
import {
  Handle,
  Position,
  useReactFlow,
  useNodeConnections,
  useNodesData,
  type NodeProps,
} from '@xyflow/react';

function UppercaseNode({ id }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const sourceData = useNodesData(connections.map((c) => c.source));

  useEffect(() => {
    const inputText = sourceData[0]?.data?.text ?? '';
    updateNodeData(id, { text: inputText.toUpperCase() });
  }, [sourceData, id, updateNodeData]);

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      <div>uppercase transform</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(UppercaseNode);
```

### Aggregator node (reads from multiple sources)

```tsx
import { memo } from 'react';
import { Handle, Position, useNodeConnections, useNodesData } from '@xyflow/react';

function ResultNode() {
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData(connections.map((c) => c.source));

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      <div>
        {nodesData.map(({ id, data }) => (
          <div key={id}>{data?.text ?? ''}</div>
        ))}
      </div>
    </div>
  );
}

export default memo(ResultNode);
```

### Conditional branching with multiple output handles

A node can route data to different handles based on computation:

```tsx
function BranchNode({ id }: NodeProps) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const sourceData = useNodesData(connections.map((c) => c.source));

  useEffect(() => {
    const value = sourceData[0]?.data?.value ?? 0;
    updateNodeData(id, {
      high: value > 50 ? value : null,
      low: value <= 50 ? value : null,
    });
  }, [sourceData, id, updateNodeData]);

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      <div>if &gt; 50</div>
      <Handle type="source" position={Position.Top} id="high" />
      <Handle type="source" position={Position.Bottom} id="low" />
    </div>
  );
}
```

Downstream nodes connect to the specific handle and check for `null` to know whether they received data.

## Dynamic handle generation

When handles are added, removed, or repositioned programmatically, React Flow must recalculate internal dimensions. Call `useUpdateNodeInternals()` after the change.

```tsx
import { useCallback, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';

function DynamicHandleNode({ id }: NodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const [outputs, setOutputs] = useState(['out-1']);

  const addHandle = useCallback(() => {
    setOutputs((prev) => {
      const next = [...prev, `out-${prev.length + 1}`];
      // Must call after state update triggers a render
      requestAnimationFrame(() => updateNodeInternals(id));
      return next;
    });
  }, [id, updateNodeInternals]);

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      <button className="nodrag" onClick={addHandle}>+ output</button>
      {outputs.map((handleId, i) => (
        <Handle
          key={handleId}
          type="source"
          position={Position.Right}
          id={handleId}
          style={{ top: `${((i + 1) / (outputs.length + 1)) * 100}%` }}
        />
      ))}
    </div>
  );
}
```

**Critical**: Call `updateNodeInternals` **after** the render that adds/removes the handle, not before. Using `requestAnimationFrame` or placing the call in a `useEffect` ensures the DOM has updated.

### Data-driven handles

Generate handles from node data rather than hardcoding them:

```tsx
function SchemaNode({ id, data }: NodeProps<Node<{ fields: string[] }>>) {
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.fields, id, updateNodeInternals]);

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      {data.fields.map((field) => (
        <div key={field} style={{ display: 'flex', alignItems: 'center' }}>
          <span>{field}</span>
          <Handle
            type="source"
            position={Position.Right}
            id={field}
          />
        </div>
      ))}
    </div>
  );
}
```

## Connection validation and cycle prevention

### Basic validation with isValidConnection

```tsx
const isValidConnection = useCallback(
  (connection: Connection) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    // Prevent duplicate edges
    const edges = getEdges();
    const exists = edges.some(
      (e) =>
        e.source === connection.source &&
        e.target === connection.target &&
        e.sourceHandle === connection.sourceHandle &&
        e.targetHandle === connection.targetHandle,
    );
    return !exists;
  },
  [getEdges],
);

<ReactFlow isValidConnection={isValidConnection} ... />
```

### Cycle prevention using getOutgoers

```tsx
import { useCallback } from 'react';
import { getOutgoers, useReactFlow, type Connection } from '@xyflow/react';

function useNoCycles() {
  const { getNodes, getEdges } = useReactFlow();

  return useCallback(
    (connection: Connection) => {
      const nodes = getNodes();
      const edges = getEdges();
      const target = nodes.find((n) => n.id === connection.target);
      if (!target) return false;

      // Prevent self-connection
      if (connection.source === connection.target) return false;

      // BFS: walk from target along outgoing edges — if we reach source, it's a cycle
      const hasCycle = (node: typeof target, visited = new Set<string>()) => {
        if (visited.has(node.id)) return false;
        visited.add(node.id);
        for (const outgoer of getOutgoers(node, nodes, edges)) {
          if (outgoer.id === connection.source) return true;
          if (hasCycle(outgoer, visited)) return true;
        }
        return false;
      };

      return !hasCycle(target);
    },
    [getNodes, getEdges],
  );
}
```

Usage:

```tsx
const isValidConnection = useNoCycles();

<ReactFlow isValidConnection={isValidConnection} ... />
```

## Connection limits

Limit the number of connections per handle using `useNodeConnections`:

```tsx
import { Handle, useNodeConnections, type HandleProps } from '@xyflow/react';

function LimitedHandle({
  connectionCount = 1,
  ...props
}: HandleProps & { connectionCount?: number }) {
  const connections = useNodeConnections({
    handleType: props.type,
    handleId: props.id,
  });

  return (
    <Handle {...props} isConnectable={connections.length < connectionCount} />
  );
}
```

Usage in a custom node:

```tsx
<LimitedHandle type="target" position={Position.Left} connectionCount={1} />
<LimitedHandle type="source" position={Position.Right} connectionCount={3} />
```

## Contextual zoom (level-of-detail rendering)

Show different content based on the current zoom level. Use `useStore` with a selector for performance — the component only re-renders when the zoom threshold is crossed, not on every zoom change:

```tsx
import { memo } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';

const showDetailSelector = (state: ReactFlowState) => state.transform[2] >= 0.9;

function DetailNode({ data }: NodeProps) {
  const showDetail = useStore(showDetailSelector);

  return (
    <div>
      <Handle type="target" position={Position.Left} />
      {showDetail ? (
        // Full content at high zoom
        <div>
          <h3>{data.label}</h3>
          <p>{data.description}</p>
          <ul>{data.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : (
        // Placeholder at low zoom
        <div style={{ padding: 10, textAlign: 'center' }}>{data.label}</div>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export default memo(DetailNode);
```

**Critical**: Define the selector **outside** the component to keep a stable reference. If defined inline, the selector identity changes every render, defeating the optimization.

## Collaborative editing

### State categorization

Before building multiplayer, decide what to sync:

| Category | Properties | Sync? |
|----------|-----------|-------|
| **Durable** | `id`, `type`, `data`, `position`, `source`, `target`, `sourceHandle`, `targetHandle` | Always sync and persist |
| **Ephemeral** | `dragging`, `resizing`, cursor positions | Sync for UX (other users see activity), do not persist |
| **Never sync** | `selected`, `measured`, `width`/`height` (computed) | Local per-user state |

### Architecture with Yjs (CRDT)

[Yjs](https://yjs.dev/) provides conflict-free replicated data types. Nodes and edges are stored in shared `Y.Map` and `Y.Array` structures. Changes merge automatically without a central server.

```bash
npm install yjs y-webrtc
```

```ts
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

// Create a shared document
const ydoc = new Y.Doc();
const provider = new WebrtcProvider('my-flow-room', ydoc);

// Shared data structures
const yNodes = ydoc.getMap<Node>('nodes');
const yEdges = ydoc.getArray<Edge>('edges');
```

Sync React Flow state with Yjs by observing changes:

```ts
import { useEffect, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

function useYjsSync(yNodes: Y.Map<Node>, yEdges: Y.Array<Edge>) {
  const { setNodes, setEdges } = useReactFlow();

  // Yjs -> React Flow: update local state when remote changes arrive
  useEffect(() => {
    const onNodesChange = () => {
      setNodes(Array.from(yNodes.values()));
    };
    const onEdgesChange = () => {
      setEdges(yEdges.toArray());
    };

    yNodes.observe(onNodesChange);
    yEdges.observe(onEdgesChange);

    // Initial sync
    onNodesChange();
    onEdgesChange();

    return () => {
      yNodes.unobserve(onNodesChange);
      yEdges.unobserve(onEdgesChange);
    };
  }, [yNodes, yEdges, setNodes, setEdges]);

  // React Flow -> Yjs: write local changes to shared doc
  const updateNode = useCallback(
    (id: string, updates: Partial<Node>) => {
      const existing = yNodes.get(id);
      if (existing) {
        yNodes.set(id, { ...existing, ...updates });
      }
    },
    [yNodes],
  );

  return { updateNode };
}
```

### Technology comparison

| Solution | Type | Offline support | Conflict resolution |
|----------|------|----------------|---------------------|
| **Yjs** | CRDT | Yes | Automatic |
| **Automerge** | CRDT | Yes | Automatic |
| **Liveblocks** | Server-authoritative | Limited | Server-managed |
| **Supabase Realtime** | Server-authoritative | No | Manual (last-write-wins) |
| **Convex** | Server-authoritative | Optimistic updates | Server-managed |

CRDTs (Yjs, Automerge) are the better fit for flow editors because node position conflicts resolve naturally (both users' moves merge). Server-authoritative solutions require more coordination logic but are simpler to set up with existing databases.

### Cursor sharing

Sync other users' cursor positions and smooth them with the [perfect-cursors](https://github.com/steveruizok/perfect-cursors) library. Debounce cursor position broadcasts to avoid flooding the network.

## Do / Don't

- Do use Zustand + Zundo for undo/redo — it's the most natural fit since React Flow uses Zustand internally.
- Do snapshot state **before** mutations (on drag start, before delete), not during intermediate states.
- Do regenerate all IDs when pasting copied nodes and edges — duplicate IDs break React Flow.
- Do remap `source`/`target` on copied edges to the new node IDs.
- Do call `updateNodeInternals` **after** the render that changes handles, not before.
- Do define `useStore` selectors outside component bodies for stable references.
- Do categorize state into durable/ephemeral/never-sync before building multiplayer.
- Don't snapshot on every `onNodesChange` — intermediate drag positions flood the history. Snapshot on drag start/stop instead.
- Don't use `structuredClone` in hot paths (every render) — only when creating snapshots.
- Don't sync `selected` or `measured` properties in collaborative editing — these are per-user local state.
- Don't forget `className="nodrag"` on interactive elements (inputs, buttons) inside custom nodes that use `updateNodeData`.
