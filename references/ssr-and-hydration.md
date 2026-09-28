# Server rendering and hydration

## When to use this reference

Use this file for server-rendered diagrams, static HTML, Next.js integration, or mismatches between server markup and the first browser render. React Flow v12 supports SSR; rendering only after mount is a fallback for dependencies that actually need the browser.

## Contents

- [Geometry before the browser exists](#geometry-before-the-browser-exists)
- [A renderable flow](#a-renderable-flow)
- [Hydrate the same graph](#hydrate-the-same-graph)
- [Framework and provider boundaries](#framework-and-provider-boundaries)
- [Verification](#verification)

## Geometry before the browser exists

The server cannot measure nodes or handles. Supply dimensions for each node and handle geometry for each edge endpoint. Use `width`/`height` for fixed node sizing, or `initialWidth`/`initialHeight` for an initial size that browser measurement can replace. Server-side `fitView` also needs the flow's width and height.

Handle IDs, types, sides, sizes, and node-relative coordinates must describe the rendered handles. A `handles` array supplies initial geometry; it does not render a custom node's `<Handle>` elements for you.

Sources: [SSR configuration](https://reactflow.dev/learn/advanced-use/ssr-ssg-configuration), [NodeHandle](https://reactflow.dev/api-reference/types/node-handle).

## A renderable flow

This complete component uses fixed geometry to keep the initial server and browser output aligned. Import `@xyflow/react/dist/style.css` through the application's CSS entrypoint on both server-rendered and client-rendered pages.

```tsx
import {
  ReactFlow, Handle, Position, useNodesState, useEdgesState,
  type Node, type NodeProps, type Edge,
} from '@xyflow/react';

type Step = Node<{ label: string }, 'step'>;
const handleSize = 8;

function StepNode({ data }: NodeProps<Step>) {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', color: '#111' }}>
      <Handle id="in" type="target" position={Position.Left}
        style={{ left: -4, top: 36, width: handleSize, height: handleSize, border: 0, transform: 'none' }} />
      <span>{data.label}</span>
      <Handle id="out" type="source" position={Position.Right}
        style={{ left: 156, right: 'auto', top: 36, width: handleSize, height: handleSize, border: 0, transform: 'none' }} />
    </div>
  );
}
const nodeTypes = { step: StepNode };
const initialNodes: Step[] = ['Start', 'Finish'].map((label, i) => ({
  id: `step-${i}`, type: 'step', data: { label },
  position: { x: i * 300, y: i * 120 }, width: 160, height: 80,
  handles: [
    { id: 'in', type: 'target', position: Position.Left, x: -4, y: 36, width: 8, height: 8 },
    { id: 'out', type: 'source', position: Position.Right, x: 156, y: 36, width: 8, height: 8 },
  ],
}));
const initialEdges: Edge[] = [{
  id: 'start-finish', source: 'step-0', sourceHandle: 'out',
  target: 'step-1', targetHandle: 'in',
}];

export default function ServerFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  return (
    <div style={{ width: 800, height: 400 }}>
      <ReactFlow id="server-flow" width={800} height={400}
      nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView />
    </div>
  );
}
```

The sized wrapper remains necessary in the browser; the `width`/`height` props supply server viewport geometry. `nodes`/`edges` initialize server state in this example. Do not substitute `defaultNodes`/`defaultEdges` alone: without provider initial state, those defaults are synchronized on the client and can leave server markup empty.

For static HTML with no client interaction, render this component with `renderToStaticMarkup`. For hydration, use your framework's SSR renderer or `renderToString` and hydrate that markup with the same component and initial props. Give separate flows on a page distinct, deterministic `id` values.

## Hydrate the same graph

Keep initial node/edge IDs, ordering, positions, data, viewport, and dimensions identical on server and client. Fetch or lay out the initial graph once and serialize the result; do not repeat nondeterministic layout during the first browser render.

Avoid `Date.now()`, random IDs, `window` reads, and localStorage reads during the initial render. Browser preferences or a saved graph can be applied after hydration in an effect or explicit restore action. Do not use `suppressHydrationWarning` to hide a graph-state mismatch.

With custom SSR plumbing, serialize data through an HTML-safe serializer; raw user strings inside an inline `<script>` can terminate the script. Framework data transport normally handles that escaping. Use matching `identifierPrefix` options on server and client if your application configures React ID prefixes.

Source: [React hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot).

## Framework and provider boundaries

For Next.js App Router, put `'use client'` at the top of the interactive flow module. Client Components can still be prerendered on the server. Only use `dynamic(..., { ssr: false })` when a dependency cannot render there; declare it inside a Client Component.

If hooks run above `<ReactFlow>`, wrap them in `<ReactFlowProvider>`. For server fitting with an outer provider, supply `initialNodes`, `initialEdges`, `initialWidth`, `initialHeight`, and `fitView` to that provider too. Create a separate store/provider for each graph and each server request. Do not put a user-specific graph in a module-level mutable store.

Sources: [ReactFlowProvider](https://reactflow.dev/api-reference/react-flow-provider), [Next.js Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components).

## Verification

- Render HTML without a DOM and assert that it already contains nodes and a nonempty edge path. A browser-only render cannot prove SSR.
- Load the server markup with JavaScript disabled; check that the diagram is visible.
- Hydrate the same markup, capture React recoverable errors and browser console errors, and compare endpoint geometry before and after hydration.
- Drag or select a node after hydration to prove event handlers are attached. Check that two simultaneous flows remain independent when the application uses them.

The repository checker exercises the example's static output and hydration in Chromium. It does not boot a Next.js application or establish compatibility with every deployment framework.
