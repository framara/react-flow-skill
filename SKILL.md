---
name: react-flow
description: "Expert guidance for React Flow (@xyflow/react): building interactive node-based graphs, custom nodes and edges, handles, state management, layouting, TypeScript patterns, performance optimization, accessibility, SSR, and theming. Use when writing React Flow code, creating custom nodes or edges, debugging flow issues, optimizing graph performance, integrating with Zustand, or building canvas-based UIs with React Flow."
---

# React Flow

## Overview

Use this skill to build, customize, debug, and optimize interactive node-based UIs with React Flow (@xyflow/react v12+). Covers everything from basic setup to advanced patterns like computed flows, sub-flows, and external layout integration.

## Version and source policy

Guidance reviewed against `@xyflow/react` **12.12.0** on **2026-09-28**. Check the target project's installed version and lockfile before applying an API; “v12+” does not mean every minor release has every feature. Preserve the project's state and styling choices unless the task requires changing them.

Use the [official documentation index](https://reactflow.dev/llms.txt) to find a specific guide or API page. For version-sensitive behavior, check [release notes](https://github.com/xyflow/xyflow/releases) and the installed package's declarations/source. Read only the references relevant to the task. Examples with omitted imports or `...` are integration sketches, not standalone applications.

## Agent behavior contract (follow these rules)

1. For v12 projects, import from `@xyflow/react`. If maintaining a legacy project, follow its installed API until a migration is in scope.
2. Always import the stylesheet: `import '@xyflow/react/dist/style.css'` (or `base.css` when replacing the default visual styles).
3. The `<ReactFlow>` parent container **must** resolve to nonzero width and height (explicit sizing or a sized flex/grid layout).
4. Define `nodeTypes` and `edgeTypes` objects **outside** component bodies or wrap in `useMemo` to prevent re-renders.
5. Use custom nodes for application-specific content or handles; built-in nodes remain suitable for simple labeled graphs.
6. Use the `nodrag` class on interactive elements inside custom nodes (inputs, buttons, selects).
7. Use `nowheel` class on scrollable elements inside custom nodes to prevent zoom interference.
8. When hiding handles, use `visibility: hidden` or `opacity: 0` — never `display: none` (breaks dimension calculation).
9. When using multiple handles of the same type on a node, always assign unique `id` props.
10. After adding, removing, or repositioning handles, call `useUpdateNodeInternals` after the DOM update, such as in an effect.
11. Always create new objects when updating node/edge state — mutations are not detected by React Flow.
12. Prefer controlled flows for non-trivial applications. Wire `onNodesChange` and `onEdgesChange` for editable controlled elements, and add `onConnect` only when users can create connections.

## First 60 seconds (triage template)

- Identify the goal from the request: new flow setup, custom nodes/edges, state management, layout, performance, styling, E2E testing, advanced patterns (undo/redo, copy/paste, computed flows, collaboration), or debugging.
- Inspect the project for these facts; ask only when a missing fact affects the solution:
  - React Flow version (v12+ uses `@xyflow/react`)
  - TypeScript or JavaScript
  - State management approach (local state, Zustand, Redux)
  - Number of nodes expected (affects performance strategy)
  - Styling approach (CSS, Tailwind, styled-components)
- Branch quickly:
  - migrating from legacy `reactflow` or `react-flow-renderer` -> package rename, import changes, API differences
  - blank canvas or missing nodes -> container dimensions or missing CSS import
  - edges not rendering -> missing handles, missing CSS, or `display: none` on handles
  - re-renders or sluggish performance -> nodeTypes defined inside component, missing memoization
  - connecting nodes not working -> missing `onConnect` handler or handle configuration
  - layout/positioning -> external layout library integration (dagre, elkjs)
  - type errors -> TypeScript generic patterns for Node/Edge types

## Routing map (read the right reference fast)

- Migrating from `reactflow` or `react-flow-renderer` to `@xyflow/react` v12 -> `references/migration.md`
- Installation, setup, first flow, node/edge objects -> `references/fundamentals.md`
- Custom node components, Handle, multiple handles, drag handles -> `references/custom-nodes.md`
- Custom edge components, path utilities, edge labels, markers -> `references/custom-edges.md`
- Event handlers, callbacks, connection validation, selection, keyboard -> `references/interactivity.md`
- Controlled vs uncontrolled, Zustand integration, state update patterns -> `references/state-management.md`
- Node/Edge types, generics, union types, type guards -> `references/typescript.md`
- External layout libraries (dagre, elkjs, d3), sub-flows, parent-child -> `references/layouting.md`
- Background, Controls, MiniMap, Panel, NodeToolbar, NodeResizer, hooks -> `references/components-and-hooks.md`
- Memoization, render optimization, theming, CSS variables, Tailwind -> `references/performance-and-styling.md`
- Keyboard workflows, accessible names, focus management, assistive technology -> `references/accessibility.md`
- Server rendering, initial geometry, hydration, Next.js boundaries -> `references/ssr-and-hydration.md`
- Common errors, debugging, edge display issues, Zustand warnings -> `references/troubleshooting.md`
- Playwright E2E tests, flow selectors, drag/viewport/connection testing -> `references/e2e-testing.md`
- Undo/redo, copy/paste, computed flows, dynamic handles, save/restore, collaboration -> `references/advanced-patterns.md`
- Context menu add node, drag-and-drop sidebar, detail panel, export as image -> `references/recipes.md`

## Common pitfalls -> next best move

- Blank canvas with no errors -> parent container has no height; set explicit `height: 100vh` or equivalent.
- `nodeTypes` / `edgeTypes` warning -> move object definition outside component body or wrap in `useMemo`.
- Edges render but in wrong position -> handles use `display: none`; switch to `opacity: 0`.
- Cannot interact with inputs inside nodes -> add `className="nodrag"` to interactive elements.
- Nodes snap back after drag -> `onNodesChange` not wired up or not applying changes correctly.
- Connection line appears but edge never creates -> `onConnect` handler missing or not calling `addEdge`.
- Multiple handles on same side overlap -> position them with CSS (`top` offset) and assign unique `id`s.
- State updates don't reflect in nodes -> creating mutations instead of new objects; spread operator required.
- Zustand context warning -> two versions of `@xyflow/react` installed or missing `<ReactFlowProvider>`.
- Sub-flow children mispositioned with "Parent node not found" warning -> ensure parent nodes appear before children in the `nodes` array.

## Verification checklist

- Confirm `@xyflow/react/dist/style.css` is imported (or `base.css` + custom styles).
- Confirm the parent container resolves to nonzero width and height.
- Confirm `nodeTypes` / `edgeTypes` are stable references (defined outside component or memoized).
- Confirm custom nodes that need connections use `<Handle>` components with proper `type`, `position`, and IDs.
- Confirm interactive elements inside nodes have `nodrag` class.
- Confirm controlled flows wire `onNodesChange`/`onEdgesChange` for editable elements and `onConnect` when connection creation is enabled.
- Confirm state updates create new node/edge objects (no mutations).
- Confirm TypeScript generics are applied to hooks and callbacks for type safety.
- Confirm performance-sensitive flows memoize custom node/edge components with `React.memo`.

For changed examples, type-check complete snippets and exercise the affected interaction in a real browser. Compilation alone does not verify handles, edge geometry, dragging, or viewport visibility.

## References

- `references/migration.md`
- `references/fundamentals.md`
- `references/custom-nodes.md`
- `references/custom-edges.md`
- `references/interactivity.md`
- `references/state-management.md`
- `references/typescript.md`
- `references/layouting.md`
- `references/components-and-hooks.md`
- `references/performance-and-styling.md`
- `references/troubleshooting.md`
- `references/e2e-testing.md`
- `references/advanced-patterns.md`
- `references/recipes.md`
- `references/accessibility.md`
- `references/ssr-and-hydration.md`
