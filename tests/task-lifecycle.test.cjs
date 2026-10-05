const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const compiled = ts.transpileModule(readFileSync('src/lib/task-lifecycle.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const { DAY_MS, isTaskExpired, completedAgeDays, lilyOpacity, taskPage } = context.exports;
const now = Date.parse('2026-10-05T12:00:00Z');
const task = (age, is_done = true) => ({ is_done, completed_at: new Date(now - age).toISOString() });

test('completed tasks expire exactly at 48 hours', () => {
  assert.equal(isTaskExpired(task(2 * DAY_MS - 1), now), false);
  assert.equal(isTaskExpired(task(2 * DAY_MS), now), true);
  assert.equal(isTaskExpired(task(3 * DAY_MS), now), true);
});
test('pending, missing and invalid dates never expire', () => {
  assert.equal(isTaskExpired(task(10 * DAY_MS, false), now), false);
  for (const completed_at of [null, 'invalid']) {
    assert.equal(isTaskExpired({ is_done: true, completed_at }, now), false);
  }
});
test('timestamps use elapsed time across timezone offsets', () => {
  assert.equal(isTaskExpired({ is_done: true, completed_at: '2026-10-02T16:00:00+04:00' }, now), true);
  assert.equal(completedAgeDays(task(-DAY_MS), now), 0);
});
test('leaves fade after 24 hours and vanish at 48 hours', () => {
  assert.equal(lilyOpacity(0), 1);
  assert.equal(lilyOpacity(1), 1);
  assert.equal(lilyOpacity(1.5), .5);
  assert.equal(lilyOpacity(2), 0);
  assert.equal(lilyOpacity(3), 0);
  assert.ok(lilyOpacity(1.9) < lilyOpacity(1.5));
});
test('large lists render bounded pages with no skipped items', () => {
  const tasks = Array.from({length: 10000}, (_, id) => id);
  const first = taskPage(tasks, 0);
  assert.equal(first.items.length, 20);
  assert.equal(first.pageCount, 500);
  assert.equal(taskPage(tasks, 1).items[0], 20);
  const last = taskPage(tasks, 499);
  assert.equal(last.items[19], 9999);
});
test('deletion and filtering clamp pagination to the available range', () => {
  assert.equal(taskPage([1], 499).page, 0);
  assert.equal(taskPage([], 499).items.length, 0);
  assert.equal(taskPage([], 499).pageCount, 1);
  assert.equal(taskPage([1, 2], -1).page, 0);
});
