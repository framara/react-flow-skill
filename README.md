# react-flow-skill

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill for building interactive node-based UIs with [React Flow](https://reactflow.dev/) (`@xyflow/react` v12+).

## What's included

The skill provides expert guidance across 11 reference topics:

- **Fundamentals** - Installation, setup, first flow, node/edge objects
- **Custom Nodes** - Custom node components, Handle, multiple handles, drag handles
- **Custom Edges** - Custom edge components, path utilities, edge labels, markers
- **Interactivity** - Event handlers, callbacks, connection validation, selection, keyboard
- **State Management** - Controlled vs uncontrolled, Zustand integration, state update patterns
- **TypeScript** - Node/Edge types, generics, union types, type guards
- **Layouting** - External layout libraries (dagre, elkjs, d3), sub-flows, parent-child
- **Components & Hooks** - Background, Controls, MiniMap, Panel, NodeToolbar, NodeResizer, hooks
- **Performance & Styling** - Memoization, render optimization, theming, CSS variables, Tailwind
- **Troubleshooting** - Common errors, debugging, edge display issues, Zustand warnings
- **E2E Testing** - Playwright setup, React Flow selectors, node/edge/viewport/connection test patterns

It also includes a 12-rule agent behavior contract covering the most critical React Flow patterns (imports, container sizing, nodeTypes stability, handle visibility, state immutability, and more) so Claude follows best practices automatically.

## Installation

```bash
npx skills add framara/react-flow-skill
```

To install globally (all projects):

```bash
npx skills add framara/react-flow-skill -g
```

## Usage

Once installed, Claude Code will automatically use this skill when you work on React Flow code. Ask it to:

- Set up a new React Flow project
- Create custom nodes and edges
- Debug blank canvas or missing edge issues
- Integrate with Zustand for state management
- Add automatic layouting with dagre or elkjs
- Optimize performance for large graphs
- Write Playwright E2E tests for React Flow applications

## License

[MIT](LICENSE)
