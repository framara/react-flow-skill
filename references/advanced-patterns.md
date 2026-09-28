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
      limit: 100,
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
import { useEffect, useRef } from 'react';
import { ReactFlow } from '@xyflow/react';
import useFlowStore from './store';

function Flow() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore();
  const dragStart = useRef<{ nodes: typeof nodes; edges: typeof edges } | null>(null);
  // Zundo attaches a vanilla temporal store to the hook.
  const { undo, redo, pause, resume } = useFlowStore.temporal.getState();

  const onNodeDragStart = () => {
    dragStart.current = {
      nodes: structuredClone(useFlowStore.getState().nodes),
      edges: structuredClone(useFlowStore.getState().edges),
    };
    pause();
  };

  const onNodeDragStop = () => {
    resume();
    const snapshot = dragStart.current;
    if (!snapshot) return;

    // Commit the entire drag gesture as one history entry.
    useFlowStore.temporal.setState((history) => ({
      pastStates: [...history.pastStates, snapshot].slice(-100),
      futureStates: [],
    }));
    dragStart.current = null;
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const target = e.target;
      if (!(target instanceof HTMLElement) ||
          target.closest('input, textarea, select') || target.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
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
      onNodeDragStart={onNodeDragStart}
      onNodeDragStop={onNodeDragStop}
      fitView
    />
  );
}
```

These are history integration sketches, not a complete editor transaction system. Scope keyboard listeners to the active editor when a page has multiple editors. `structuredClone` requires cloneable data; functions and React elements need a domain-specific snapshot representation. Manual ref-based `canUndo`/`canRedo` queries do not subscribe UI buttons to history changes.

Zundo records every Zustand setter call by default. Because dragging emits many `onNodesChange` calls, pause temporal tracking during the gesture and append the pre-drag snapshot once on drag stop. Apply the same transaction-boundary idea to resize gestures and other continuous interactions. Selection, measurement, and final drag change events also reach the store: filter transient changes and test that one gesture produces one undo step before using this in an editor.

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
    past.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    past.current = past.current.slice(-maxHistory);
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

### Pattern: in-memory clipboard

Keep copied elements in a ref for an editor-local clipboard. Regenerate IDs on paste, offset positions so pasted nodes do not overlap originals, and remap edge endpoints. For cross-tab or system clipboard support, serialize this payload through the browser Clipboard API and handle its permission and format constraints separately.

```tsx
import { useCallback, useRef } from 'react';
import { useReactFlow, type Node, type Edge } from '@xyflow/react';

let idCounter = 0;
const newId = () => `pasted_${Date.now()}_${idCounter++}`;

export function useCopyPaste() {
  const { getNodes, getEdges, setNodes, setEdges, deleteElements } = useReactFlow();
  const clipboard = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const copy = useCallback(() => {
    const nodes = getNodes(); // Keep React Flow's parent-before-child ordering.
    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    // Copy descendants with their selected parent, including nested groups.
    for (const node of nodes) {
      if (node.parentId && selectedNodeIds.has(node.parentId)) selectedNodeIds.add(node.id);
    }
    const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
    // Copy edges whose endpoints are both included in the clipboard
    const selectedEdges = getEdges().filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    clipboard.current = {
      nodes: structuredClone(selectedNodes),
      edges: structuredClone(selectedEdges),
    };
  }, [getNodes, getEdges]);

  const cut = useCallback(async () => {
    copy();
    // Respects deletable/onBeforeDelete and cleans up child nodes and edges.
    await deleteElements({ nodes: getNodes().filter((n) => n.selected) });
  }, [copy, getNodes, deleteElements]);

  const paste = useCallback(
    (position?: { x: number; y: number }) => {
      if (!clipboard.current?.nodes.length) return;

      // Each paste owns its data; do not share nested objects with the clipboard.
      const { nodes: copiedNodes, edges: copiedEdges } = structuredClone(clipboard.current);
      // Map old IDs to new IDs
      const idMap = new Map<string, string>();
      copiedNodes.forEach((n) => idMap.set(n.id, newId()));

      // Only top-level copied nodes move; copied children retain local coordinates.
      const roots = copiedNodes.filter((n) => !n.parentId || !idMap.has(n.parentId));
      // An explicit position is in flow space; reject it for children whose
      // parent is outside the clipboard (their positions are parent-relative).
      if (position && roots.some((n) => n.parentId)) return;
      const offset = position
        ? (() => {
            const avgX =
              roots.reduce((sum, n) => sum + n.position.x, 0) /
              roots.length;
            const avgY =
              roots.reduce((sum, n) => sum + n.position.y, 0) /
              roots.length;
            return { x: position.x - avgX, y: position.y - avgY };
          })()
        : { x: 50, y: 50 };

      // If an uncopied parent was deleted since copy, decline this paste.
      const currentIds = new Set(getNodes().map((n) => n.id));
      if (roots.some((n) => n.parentId && !currentIds.has(n.parentId))) return;

      const newNodes = copiedNodes.map((n) => ({
        ...n,
        id: idMap.get(n.id)!,
        position: n.parentId && idMap.has(n.parentId)
          ? n.position
          : { x: n.position.x + offset.x, y: n.position.y + offset.y },
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
    [getNodes, setNodes, setEdges],
  );

  return { copy, cut, paste };
}
```

Copied groups include descendants and retain their relative positions. Copying a child alone keeps it under its original parent; this sketch declines explicit flow-space placement or pasting after that parent was deleted. Convert to absolute coordinates and detach deliberately if your editor needs that behavior.

Wire up keyboard shortcuts:

```tsx
const { copy, cut, paste } = useCopyPaste();

useEffect(() => {
  const onKeyDown = (e: KeyboardEvent) => {
    // Leave native text editing and IME composition alone.
    if (e.defaultPrevented || e.isComposing) return;
    const target = e.target;
    if (!(target instanceof HTMLElement) ||
        target.closest('input, textarea, select') || target.isContentEditable) return;

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

The returned object is JSON-serializable only if the node/edge data and labels are. Keep persisted data separate from functions, React elements, and runtime state. On restore, parse and validate the payload before replacing either array; handle malformed data, storage failures, and schema migrations in the application.

## Computed flows (reactive data pipelines)

Build nodes that react to data from connected nodes. Three hooks work together:

| Hook | Purpose |
|------|---------|
| `useNodeConnections({ handleType })` | Discover which nodes are connected to a handle |
| `useNodesData(nodeIds)` | Subscribe to data changes on connected nodes |
| `updateNodeData(id, data)` | Write computed results back to the node |

### Input node (writes data)

```tsx
import { memo, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, type NodeProps, type Node } from '@xyflow/react';

type TextNodeData = { text: string };

function TextNode({ id, data }: NodeProps<Node<TextNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const [text, setText] = useState(data.text);
  // Reflect external changes such as undo/restore.
  useEffect(() => setText(data.text), [data.text]);

  return (
    <div className="nodrag">
      <Handle type="source" position={Position.Right} />
      <input
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          updateNodeData(id, { text: e.target.value });
        }}
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
  type Node,
} from '@xyflow/react';

type UppercaseNodeData = { text: string };

function UppercaseNode({ id }: NodeProps<Node<UppercaseNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const sourceData = useNodesData<Node<UppercaseNodeData>>(
    connections.map((c) => c.source),
  );

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
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  type Node,
} from '@xyflow/react';

function ResultNode() {
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<Node<{ text: string }>>(
    connections.map((c) => c.source),
  );

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
type BranchNodeData = { high: number | null; low: number | null };

function BranchNode({ id }: NodeProps<Node<BranchNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const sourceData = useNodesData<Node<{ value: number }>>(
    connections.map((c) => c.source),
  );

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
import { useCallback, useEffect, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';

function DynamicHandleNode({ id }: NodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const [outputs, setOutputs] = useState(['out-1']);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, outputs, updateNodeInternals]);

  const addHandle = useCallback(() => {
    setOutputs((prev) => [...prev, `out-${prev.length + 1}`]);
  }, []);

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

**Critical**: Call `updateNodeInternals` **after** the render that adds/removes the handle, not before. An effect tied to the rendered handle state runs after commit. Keep state updaters pure; scheduling a frame inside an updater is a side effect and can run more than once under Strict Mode. When removing a handle, also remove or remap edges that reference its ID.

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
        <div key={field} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
// Set/clear this ref with onReconnectStart/onReconnectEnd, as shown below.
const reconnectingEdgeId = useRef<string | null>(null);
const isValidConnection = useCallback(
  (connection: Connection | Edge) => {
    // Prevent self-connections
    if (connection.source === connection.target) return false;

    // Prevent duplicate edges
    const edges = getEdges();
    const exists = edges.some(
      (e) =>
        e.id !== reconnectingEdgeId.current &&
        e.source === connection.source &&
        e.target === connection.target &&
        (e.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
        (e.targetHandle ?? null) === (connection.targetHandle ?? null),
    );
    return !exists;
  },
  [getEdges],
);

<ReactFlow isValidConnection={isValidConnection} ... />
```

### Cycle prevention using getOutgoers

```tsx
import { useCallback, type RefObject } from 'react';
import { getOutgoers, useReactFlow, type Connection, type Edge } from '@xyflow/react';

function useNoCycles(reconnectingEdgeId?: RefObject<string | null>) {
  const { getNodes, getEdges } = useReactFlow();

  return useCallback(
    (connection: Connection | Edge) => {
      const nodes = getNodes();
      const edges = getEdges().filter((e) => e.id !== reconnectingEdgeId?.current);
      const target = nodes.find((n) => n.id === connection.target);
      if (!target) return false;

      // Prevent self-connection
      if (connection.source === connection.target) return false;

      // DFS: walk from target along outgoing edges — if we reach source, it's a cycle
      const hasCycle = (node: typeof target, visited = new Set<string>()): boolean => {
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
    [getNodes, getEdges, reconnectingEdgeId],
  );
}
```

Usage:

```tsx
const reconnectingEdgeId = useRef<string | null>(null);
const isValidConnection = useNoCycles(reconnectingEdgeId);

<ReactFlow
  isValidConnection={isValidConnection}
  onReconnectStart={(_, edge) => { reconnectingEdgeId.current = edge.id; }}
  onReconnectEnd={() => { reconnectingEdgeId.current = null; }}
  // Also wire onReconnect with reconnectEdge to persist the new endpoints.
  ...
/>
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
    handleId: props.id ?? undefined,
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
import {
  Handle,
  Position,
  useStore,
  type Node,
  type NodeProps,
  type ReactFlowState,
} from '@xyflow/react';

type DetailNodeData = { label: string; description: string; items: string[] };

const showDetailSelector = (state: ReactFlowState) => state.transform[2] >= 0.9;

function DetailNode({ data }: NodeProps<Node<DetailNodeData>>) {
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

A module-level selector avoids recreating the function. The boolean result and the store equality check prevent unrelated zoom updates from rendering this component; an inline selector does not inherently defeat that optimization.

## Collaborative editing

### State categorization

Before building multiplayer, decide what to sync:

| Category | Properties | Sync? |
|----------|-----------|-------|
| **Durable** | `id`, `type`, `data`, `position`, `width`/`height` (user-set), `source`, `target`, `sourceHandle`, `targetHandle` | Always sync and persist |
| **Ephemeral** | `dragging`, `resizing`, cursor positions | Sync for UX (other users see activity), do not persist |
| **Never sync** | `selected`, `measured` (computed dimensions) | Local per-user state |

### Architecture with Yjs (CRDT)

[Yjs](https://yjs.dev/) provides conflict-free replicated data types. The starter below stores each complete node as one `Y.Map` value and edges in a `Y.Array`.

```bash
npm install yjs y-webrtc
```

```ts
import type { Node, Edge } from '@xyflow/react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

// Create a shared document
const ydoc = new Y.Doc();
const provider = new WebrtcProvider('my-flow-room', ydoc);

// Shared data structures
const yNodes = ydoc.getMap<Node>('nodes');
const yEdges = ydoc.getArray<Edge>('edges');
```

This fragment illustrates observation and a node update only. A complete adapter must preserve local selection/measurements, sort parents before children, handle additions/deletions/edges, avoid echoing remote updates, and destroy the provider/document on cleanup.

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

CRDTs such as Yjs and Automerge can be a strong fit for offline-capable flow editors, but the data model determines merge granularity. In the starter above, concurrent edits to different node IDs merge, while concurrent replacements of the same complete node value resolve as competing writes rather than merging individual fields. Use a nested `Y.Map` per node—or another field-level shared structure—when position, data, and dimensions must merge independently. Server-authoritative solutions require explicit conflict policy but may integrate more simply with an existing backend.

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
