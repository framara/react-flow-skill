# Migration Guide

## When to use this reference

Use this file when upgrading a project from the legacy `reactflow` package (v11 or earlier) to `@xyflow/react` (v12+), or from `react-flow-renderer` (v10 or earlier) to current.

## Contents

- [Package rename](#package-rename)
- [Import changes](#import-changes)
- [CSS import changes](#css-import-changes)
- [Node dimensions](#node-dimensions)
- [Immutable state updates](#immutable-state-updates)
- [Renamed node and reconnect APIs](#renamed-node-and-reconnect-apis)
- [Custom node props renamed](#custom-node-props-renamed)
- [Handle classes and internal store names](#handle-classes-and-internal-store-names)
- [TypeScript type changes](#typescript-type-changes)
- [Hooks changes](#hooks-changes)
- [Removed utilities and change events](#removed-utilities-and-change-events)
- [Step-by-step checklist](#step-by-step-checklist)

## Package rename

The package name changed across major versions:

| Version | Package name | Import style |
|---------|-------------|--------------|
| v10 and earlier | `react-flow-renderer` | `import ReactFlow from 'react-flow-renderer'` |
| v11 | `reactflow` | `import ReactFlow from 'reactflow'` |
| v12+ (current) | `@xyflow/react` | `import { ReactFlow } from '@xyflow/react'` |

To migrate:

```bash
# Remove the old package
npm uninstall reactflow
# or: npm uninstall react-flow-renderer

# Install the new package
npm install @xyflow/react
```

## Import changes

v11 used a default export. v12 uses named exports:

```tsx
// v11 (old)
import ReactFlow, { Background, Controls, MiniMap } from 'reactflow';

// v12 (new)
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
```

All subpackage imports (`@reactflow/core`, `@reactflow/background`, etc.) are consolidated into `@xyflow/react`. Remove any subpackage dependencies.

## CSS import changes

```tsx
// v11 (old)
import 'reactflow/dist/style.css';

// v12 (new)
import '@xyflow/react/dist/style.css';

// or for custom styling frameworks (Tailwind, styled-components):
import '@xyflow/react/dist/base.css';
```

## Immutable state updates

v11 tolerated mutations when updating nodes. v12 requires immutable updates — mutations are not detected:

```tsx
// v11 (old) — mutations worked
setNodes((currentNodes) =>
  currentNodes.map((node) => {
    node.hidden = true;  // mutation
    return node;
  }),
);

// v12 (new) — must create new objects
setNodes((currentNodes) =>
  currentNodes.map((node) => ({
    ...node,
    hidden: true,
  })),
);
```

This applies everywhere: `setNodes`, `setEdges`, `onNodesChange` handlers, Zustand stores, etc.

## Node dimensions

Measured dimensions moved from `node.width`/`node.height` to `node.measured.width`/`node.measured.height`. In v12, top-level `width` and `height` set fixed inline dimensions instead:

```tsx
const measuredWidth = node.measured?.width;

const fixedSizeNode = {
  id: '1',
  position: { x: 0, y: 0 },
  data: {},
  width: 180,
  height: 40,
};
```

Update layout integrations to read `node.measured`, and remove persisted v11 measurement fields unless they are intentionally becoming fixed dimensions.

## Renamed node and reconnect APIs

Rename `parentNode` to `parentId` for sub-flow children.

The edge update APIs were renamed:

| v11 | v12 |
|-----|-----|
| `onEdgeUpdate` | `onReconnect` |
| `onEdgeUpdateStart` | `onReconnectStart` |
| `onEdgeUpdateEnd` | `onReconnectEnd` |
| `updateEdge` utility | `reconnectEdge` |
| `edgeUpdaterRadius` | `reconnectRadius` |
| `edge.updatable` | `edge.reconnectable` |
| `edgesUpdatable` | `edgesReconnectable` |

## Custom node props renamed

The position props passed to custom nodes were renamed:

```tsx
// v11 (old)
function CustomNode({ xPos, yPos }) {
  // ...
}

// v12 (new)
function CustomNode({ positionAbsoluteX, positionAbsoluteY }) {
  // ...
}
```

## Handle classes and internal store names

Handle state classes changed:

- `react-flow__handle-connecting` -> `connectingfrom` / `connectingto`
- `react-flow__handle-valid` -> `valid`

If code reads React Flow's internal store, rename `nodeInternals` to `nodeLookup`. Prefer public hooks and instance methods where possible because internal state is not a stable integration surface.

## TypeScript type changes

v12 simplified the generic type system for nodes and edges. Instead of passing data generics to every hook, define a union type and use it everywhere:

```ts
// v11 (old) — generic on each usage
import { Node } from 'reactflow';
type MyNode = Node<{ label: string; value: number }>;

// v12 (new) — discriminated union with type tag
import { type Node } from '@xyflow/react';

type NumberNode = Node<{ value: number }, 'number'>;
type TextNode = Node<{ text: string }, 'text'>;
type AppNode = NumberNode | TextNode;
```

Apply the union type to hooks and callbacks:

```ts
const { getNodes, getEdges } = useReactFlow<AppNode, AppEdge>();
const onNodesChange: OnNodesChange<AppNode> = useCallback(
  (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
  [],
);
```

## Hooks changes

| v11 | v12 | Notes |
|-----|-----|-------|
| `useNodesState` | Still available | Works the same way |
| `useEdgesState` | Still available | Works the same way |
| `useReactFlow().project()` | `useReactFlow().screenToFlowPosition()` | Renamed |
| `useReactFlow().setTransform()` | `useReactFlow().setViewport()` | Renamed (from v10) |

New hooks in v12 (no v11 equivalent):

- `useNodesData(nodeIds)` — subscribe to data changes on specific nodes

Note: `useHandleConnections` is a v12-only hook (introduced in 12.0, deprecated in 12.4) — you won't find it in v11 code. Use `useNodeConnections` instead.

## Removed utilities and change events

Replace removed deprecated APIs:

| Removed in v12 | Replacement |
|----------------|-------------|
| `getTransformForBounds` | `getViewportForBounds` |
| `getRectOfNodes` | `getNodesBounds` |
| `project` | `screenToFlowPosition` |
| `updateEdge` utility | `reconnectEdge` |

Custom implementations of `applyNodeChanges` or `applyEdgeChanges` must handle the new `replace` change event. The old `reset` event was removed.

## Step-by-step checklist

1. Replace the package: `npm uninstall reactflow && npm install @xyflow/react`
2. Find-and-replace all imports:
   - `from 'reactflow'` → `from '@xyflow/react'`
   - `import ReactFlow` (default) → `import { ReactFlow }` (named)
   - `'reactflow/dist/style.css'` → `'@xyflow/react/dist/style.css'`
3. Remove any `@reactflow/*` subpackage dependencies
4. Move measured-dimension reads to `node.measured` and review persisted `width`/`height`
5. Rename `parentNode` to `parentId` and migrate edge-update APIs to reconnect APIs
6. Update custom node components: `xPos` → `positionAbsoluteX`, `yPos` → `positionAbsoluteY`
7. Audit all `setNodes` / `setEdges` calls for mutations — convert to spread-based immutable updates
8. Update handle-state CSS classes and any `nodeInternals` store access
9. Replace removed utilities and handle the `replace` change in custom change applicators
10. Update TypeScript types to use the new `Node<Data, Type>` union pattern
11. If you've already adopted `useHandleConnections` (v12-only, deprecated in 12.4), replace it with `useNodeConnections`
12. Test that the flow renders correctly (check for blank canvas = missing CSS or container dimensions)

## Do / Don't

- Do run a project-wide search for `'reactflow'` and `'react-flow-renderer'` to catch all imports.
- Do update TypeScript generics to the new discriminated union pattern — it's more powerful and type-safe.
- Do check for node mutations in Zustand stores — these are the most common source of silent breakage after migration.
- Don't keep both `reactflow` and `@xyflow/react` installed — this causes duplicate React Flow instances and Zustand context errors.
- Don't use `@reactflow/*` subpackages — everything is consolidated in `@xyflow/react`.
