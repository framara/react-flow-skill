# Skill evaluations

These tasks test whether an agent can use the skill to deliver working React Flow behavior. The grader checks the resulting app, independently of the agent's own success claim.

| Case | Task | Observable checks |
| --- | --- | --- |
| [Keyboard editor](cases/keyboard-editor/prompt.md) | Build an editor with keyboard connections and an editable custom node | Tab/select/Enter connection creation, duplicate/self rejection, label propagation, text editing, node movement/deletion |
| [Repair flow](cases/repair-flow/prompt.md) | Repair a supplied editor | Edge rendering, reactive calculation, persistent drag, input isolation, connection creation, deletion cleanup |

Both cases also require strict TypeScript compilation, initial rendering, and no uncaught browser errors. Review controlled state, meaningful names, and visible focus manually. The checks do not establish screen-reader support or full accessibility conformance.

## Run a fresh agent evaluation

1. Install the maintainer dependencies and browser using the [repository instructions](../README.md#maintenance-and-verification).
2. Create an isolated candidate directory. For the repair task, copy [starter/App.tsx](cases/repair-flow/starter/App.tsx) into it. The keyboard task starts empty.
3. Give a fresh agent the relevant prompt, the path to this repository's `SKILL.md`, and that directory. Supply access to the pinned verification dependencies and browser tooling for its own checks. Tell it to read only the skill/references and its task artifacts, not graders, controls, or results. Do not give it the intended solution or findings from earlier attempts.
4. Preserve the first attempt before grading. Grade an app-only directory containing `App.tsx` and any local modules/styles; keep the agent's temporary scaffolding and test scripts outside it.
5. From this repository root, run:

```bash
node scripts/grade-eval.mjs keyboard-editor /absolute/path/to/candidate
# or:
node scripts/grade-eval.mjs repair-flow /absolute/path/to/candidate
```

Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Chrome instead of Playwright's bundled Chromium. The script returns a nonzero exit code for failed checks and prints the report path. It executes candidate code locally: review unknown submissions before running them.

Keep the JSON report, screenshot, and trace from `verification/artifacts/`. Record the skill revision or working-tree snapshot, model/agent context, candidate hash, manual findings, and any retries. A grader bug can be corrected and rerun against the unchanged candidate, but document that correction. If the app fails a real requirement, preserve the failure before changing instructions or running a fresh attempt.

## CI controls and limitations

[Captured outputs](controls/) are unchanged app files from the first independent agents used during the September 2026 update. They serve as positive regression controls for the grader. The broken repair starter is a negative control: it must compile and render, then fail the seeded edge, reactive-data, and drag checks. `npm test --prefix verification` runs these controls.

CI replays apps; it does not launch fresh agents, measure prompting improvements, or require AI credentials. Run fresh evaluations when instructions change in ways that may affect agent behavior. Two successful tasks are a small smoke test, not a general quality score. Without a matched no-skill baseline they do not measure the skill's causal benefit.

See [the initial evaluation record](results/2026-09-28.md) for evidence and limitations.
