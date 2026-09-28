#!/usr/bin/env node
import assert from 'node:assert/strict';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gradeEval } from './grade-eval.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
for (const scenario of ['keyboard-editor', 'repair-flow']) {
  results.push(await gradeEval(scenario, join(root, 'evals/controls', scenario)));
}
const negative = await gradeEval('repair-flow', join(root, 'evals/cases/repair-flow/starter'));
assert(results.every(result => result.passed), 'A captured working control failed; inspect its report');
assert(negative.checks.find(check => check.name === 'typecheck')?.passed, 'Negative control must compile');
assert(negative.checks.find(check => check.name === 'initial-nodes')?.passed, 'Negative control must render');
for (const name of ['initial-edge', 'reactive-calculation', 'drag-persists']) {
  assert.equal(negative.checks.find(check => check.name === name)?.passed, false, `Grader must detect the seeded ${name} defect`);
}
assert(!negative.checks.some(check => check.name === 'harness'), 'Harness errors do not count as detected defects');
console.log('PASS evaluation harness: both captured apps pass and seeded edge/state/drag defects are rejected');
