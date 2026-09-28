# react-flow-skill

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill for building interactive node-based UIs with [React Flow](https://reactflow.dev/) (`@xyflow/react` v12+).

## What's included

The skill provides expert guidance across 16 reference topics:

- **Migration** - Upgrading from `reactflow`/`react-flow-renderer` to `@xyflow/react` v12
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
- **Advanced Patterns** - Undo/redo, copy/paste, computed flows, dynamic handles, save/restore, collaboration
- **Accessibility** - Keyboard connections, accessible names, focus, editable controls
- **SSR & Hydration** - Server geometry, initial state, hydration, framework boundaries
- **Common Recipes** - Context menu node creation, drag-and-drop sidebar, detail panels, export as image

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
- Migrate from legacy `reactflow` package to `@xyflow/react` v12
- Implement undo/redo, copy/paste, or computed data flows

## Maintenance and verification

Reviewed against `@xyflow/react` **12.12.0** on **2026-09-28**, using the published package types/source and [official documentation](https://reactflow.dev/llms.txt). Newer APIs have minor-version notes; inspect the target project's installed version before applying them.

Maintainer checks run on pull requests and pushes to `main` through [GitHub Actions](.github/workflows/verify.yml):

- [Documentation checks](scripts/check-docs.mjs) validate local links, heading targets, fenced code, frontmatter, and reference routing.
- [Example checks](scripts/verify-examples.mjs) type-check 15 extracted Markdown examples and exercise layout, keyboard interaction, server rendering without JavaScript, hydration, and browser regressions.
- [Evaluation checks](evals/README.md) replay captured agent-built apps and confirm a deliberately broken starter fails. Fresh agent evaluations are run separately; CI does not call an AI service.

Run from the repository root with Node.js **22.12+** and npm:

```bash
npm ci --prefix verification --ignore-scripts --no-audit --no-fund
verification/node_modules/.bin/playwright install chromium
npm test --prefix verification
```

To use an existing Google Chrome installation, skip the browser download and run `PLAYWRIGHT_CHANNEL=chrome npm test --prefix verification`. Dependencies are pinned in `verification/package-lock.json`; generated sources, screenshots, traces, and reports stay in the ignored `verification/artifacts/` directory. CI uploads those artifacts even when a check fails.

These tools are optional for skill users. Coverage is selective: not every integration sketch, third-party adapter, browser, framework, or older React Flow version is tested. Keyboard checks do not replace screen-reader testing. External URLs are not included in the local link checker.

## License

[MIT](LICENSE)
