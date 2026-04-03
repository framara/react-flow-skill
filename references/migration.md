# Migration Guide

## When to use this reference

Use this file when upgrading a project from the legacy `reactflow` package (v11 or earlier) to `@xyflow/react` (v12+), or from `react-flow-renderer` (v10 or earlier) to current.

## Contents

- [Package rename](#package-rename)
- [Import changes](#import-changes)
- [CSS import changes](#css-import-changes)
- [Immutable state updates](#immutable-state-updates)
- [Custom node props renamed](#custom-node-props-renamed)
- [TypeScript type changes](#typescript-type-changes)
- [Hooks changes](#hooks-changes)
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
| `useHandleConnections` | `useNodeConnections` | Renamed |
| `useReactFlow().project()` | `useReactFlow().screenToFlowPosition()` | Renamed |
| `useReactFlow().setTransform()` | `useReactFlow().setViewport()` | Renamed (from v10) |

New hooks in v12 (no v11 equivalent):

- `useNodesData(nodeIds)` — subscribe to data changes on specific nodes
- `useUpdateNodeInternals()` — trigger handle recalculation after dynamic changes

## Step-by-step checklist

1. Replace the package: `npm uninstall reactflow && npm install @xyflow/react`
2. Find-and-replace all imports:
   - `from 'reactflow'` → `from '@xyflow/react'`
   - `import ReactFlow` (default) → `import { ReactFlow }` (named)
   - `'reactflow/dist/style.css'` → `'@xyflow/react/dist/style.css'`
3. Remove any `@reactflow/*` subpackage dependencies
4. Update custom node components: `xPos` → `positionAbsoluteX`, `yPos` → `positionAbsoluteY`
5. Audit all `setNodes` / `setEdges` calls for mutations — convert to spread-based immutable updates
6. Update TypeScript types to use the new `Node<Data, Type>` union pattern
7. Rename deprecated hooks: `useHandleConnections` → `useNodeConnections`
8. Test that the flow renders correctly (check for blank canvas = missing CSS or container dimensions)

## Do / Don't

- Do run a project-wide search for `'reactflow'` and `'react-flow-renderer'` to catch all imports.
- Do update TypeScript generics to the new discriminated union pattern — it's more powerful and type-safe.
- Do check for node mutations in Zustand stores — these are the most common source of silent breakage after migration.
- Don't keep both `reactflow` and `@xyflow/react` installed — this causes duplicate React Flow instances and Zustand context errors.
- Don't use `@reactflow/*` subpackages — everything is consolidated in `@xyflow/react`.
