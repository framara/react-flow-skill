Fix the React Flow editor in `App.tsx`, using the supplied React Flow skill.

The initial edge is missing, nodes do not stay where I drag them, and changing the source number does not reliably update the result. I also need to edit the number without moving or deleting its node. Preserve the initial node IDs (`source` and `result`), their positions, edge ID `source-result`, the `Value` input label, and the `Result` output label. The result should always be twice the current source value. Keep the graph controlled in React state, retain connection creation and keyboard node deletion, and avoid adding packages or changing unrelated UI.

The harness supplies React 19, `@xyflow/react` 12.12.0, TypeScript, a 1000 × 700 browser, and the React Flow stylesheet. Return `App.tsx` with its default export and any local TS/TSX/CSS modules you need. Briefly report what you verified. Do not read grading code, other solutions, or evaluation results; tests run independently.
