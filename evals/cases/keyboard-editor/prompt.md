Build a small React Flow workflow editor that can be used without dragging with a mouse.

Use the React Flow skill supplied with this task. Create `App.tsx` with a default export; the harness supplies React 19, `@xyflow/react` 12.12.0, TypeScript, a 1000 × 700 browser, and the React Flow stylesheet. You may add local TS/TSX/CSS files. Do not add dependencies or change the harness.

Requirements:

- Start with two custom nodes: ID `source`, label `Source`, at (100, 180); ID `result`, label `Result`, at (500, 180). Each supports a source and a target handle. Start with no edges.
- Show a form with native selects labeled `From` and `To`, offering the node labels, and a button named `Connect steps`. The complete form must work with Tab, native select keys, and Enter. Reject self-connections and duplicates. Announce success/failure through a status region.
- Allow editing the first node's label through an input labeled `Source label` inside that node. A changed label must update the endpoint option and the node's accessible name. Backspace in the input must not delete its node.
- Retain React Flow's keyboard selection, arrow movement, and deletion. The nodes must have meaningful accessible names and a visible keyboard focus indicator.
- Preserve controlled nodes/edges in React state. Give the flow a usable size and keep the form reachable alongside it.

Return the finished source files and briefly report what you verified. Do not read grading code, other solutions, or evaluation results. The output will be tested independently.
