# Accessibility and keyboard interaction

## When to use this reference

Use this file when building keyboard workflows, labeling a graph for assistive technology, managing focus, or reviewing custom node controls. Keep the application's accessibility requirements in scope; adding ARIA labels alone does not establish accessibility conformance.

## Contents

- [Keep the built-in keyboard behavior](#keep-the-built-in-keyboard-behavior)
- [Name the graph and its controls](#name-the-graph-and-its-controls)
- [Keyboard connection creation](#keyboard-connection-creation)
- [Editing and focus management](#editing-and-focus-management)
- [Verify observable behavior](#verify-observable-behavior)

## Keep the built-in keyboard behavior

React Flow makes nodes and edges focusable by default. Enter/Space selects the focused element; Escape clears selection. Selected, draggable nodes can move with arrow keys. Focus can pan a node into view through `autoPanOnNodeFocus`.

Keep `nodesFocusable` and `edgesFocusable` enabled for interactive elements. `disableKeyboardA11y` disables built-in arrow-key movement; it does not remove every keyboard interaction. Avoid changing a node's default group role to `button` when it contains a form or several actions.

Source: [React Flow accessibility](https://reactflow.dev/learn/advanced-use/accessibility).

## Name the graph and its controls

- Give nodes and edges meaningful `ariaLabel` values. A node ID alone rarely explains its purpose.
- Use visible `<label>` elements for inputs and accessible names for icon buttons. Do not rely on placeholder text or tooltips alone.
- Customize the relevant `ariaLabelConfig` keys and keep instructions consistent with actual shortcuts. For example, the default deletion key is Backspace; if instructions say Delete, enable Delete too.
- Preserve visible `:focus-visible` styles. Test contrast in each supported theme.

Example configuration (merge into the owning flow):

```tsx
import type { AriaLabelConfig } from '@xyflow/react';

const ariaLabelConfig: Partial<AriaLabelConfig> = {
  'node.a11yDescription.default':
    'Press Enter to select. Use arrow keys to move, Delete to remove, Escape to deselect.',
  'edge.a11yDescription.default':
    'Press Enter to select this connection, Delete to remove it, Escape to deselect.',
  'controls.zoomIn.ariaLabel': 'Zoom into the workflow',
};

// <ReactFlow ariaLabelConfig={ariaLabelConfig}
//   deleteKeyCode={['Backspace', 'Delete']} ... />
```

Source: [AriaLabelConfig](https://reactflow.dev/api-reference/types/aria-label-config).

## Keyboard connection creation

A draggable handle is not a complete keyboard connection workflow. Offer an equivalent form or command that names the endpoints, applies the same validation as pointer connections, updates graph state, and announces the result. Multi-handle graphs must also let users choose ports and pass `sourceHandle`/`targetHandle` IDs.

This component is for a small graph with one source and one target handle per eligible node. Mount it inside `<ReactFlow>` (it returns a `<Panel>`) and keep controlled edge change handlers wired. In large graphs, replace the full node subscription with the application's endpoint catalog.

```tsx
import { useState, type FormEvent } from 'react';
import { Panel, addEdge, useNodes, useReactFlow } from '@xyflow/react';

export default function KeyboardConnections() {
  const nodes = useNodes();
  const { getEdges, setEdges } = useReactFlow();
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');

  function connect(event: FormEvent) {
    event.preventDefault();
    if (!nodes.some((n) => n.id === source) || !nodes.some((n) => n.id === target)) {
      setMessage('Choose two available steps.');
      return;
    }
    if (source === target) {
      setMessage('Choose different steps.');
      return;
    }
    if (getEdges().some((e) => e.source === source && e.target === target)) {
      setMessage('These steps are already connected.');
      return;
    }
    setEdges((edges) => addEdge({ source, target, sourceHandle: null, targetHandle: null }, edges));
    setMessage('Connection added.');
  }

  return (
    <Panel position="top-left">
      <form onSubmit={connect} className="nodrag nopan">
        <label>From
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">Choose a step</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{String(n.data.label ?? n.id)}</option>)}
          </select>
        </label>
        <label>To
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Choose a step</option>
            {nodes.map((n) => <option key={n.id} value={n.id}>{String(n.data.label ?? n.id)}</option>)}
          </select>
        </label>
        <button type="submit">Connect steps</button>
        <p role="status">{message}</p>
      </form>
    </Panel>
  );
}
```

Factor these example rules into a shared validator when also allowing handle connections. For graphs with cycles, port compatibility, or connection limits, use the rules in [advanced patterns](advanced-patterns.md#connection-validation-and-cycle-prevention).

## Editing and focus management

Use `nodrag` on node inputs and `nopan` on overlays; add `nowheel` to scrollable content. These classes handle pointer conflicts, not application-wide keyboard shortcuts. Global copy, undo, and delete handlers must leave inputs, textareas, selects, contenteditable elements, and IME composition alone.

When closing a node dialog, return focus to its opener if it still exists. After deleting that opener, focus a surviving node or an explicitly focusable editor control. Avoid relying on a DOM element that deletion has already removed. A panel that merely becomes visually hidden must not leave its controls in the Tab order.

Source: [React Flow utility classes](https://reactflow.dev/learn/customization/utility-classes). See [advanced patterns](advanced-patterns.md) for guarded shortcut examples.

## Verify observable behavior

Exercise these paths in a browser:

1. Reach a node with Tab, select it, move it with an arrow key, and confirm the graph state changes.
2. Reach custom form controls with Tab and edit text; Backspace must edit text without deleting the node.
3. Create a connection without dragging. Confirm the edge appears, duplicate/invalid choices are rejected, and a status message is exposed.
4. Close dialogs and delete selected items; check where focus lands and whether it remains visible.
5. Inspect accessible names and focus styles. Then test announcements and navigation with the intended screen reader/browser combination.

Automated DOM and keyboard checks cover specific behaviors. They do not substitute for a screen-reader session, contrast review, or an assessment of the complete application's accessibility.
