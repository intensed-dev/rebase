import test from "node:test";
import assert from "node:assert/strict";
import { computed, render, state, watch } from "../src/index.js";

test("state supports functional updates", () => {
  const count = state(1);
  count.value = value => value + 2;
  assert.equal(count.value, 3);
});
test("computed follows dependencies", () => {
  const count = state(2);
  const doubled = computed(() => count.value * 2, [count]);
  count.value = 4;
  assert.equal(doubled.value, 8);
  doubled.stop();
});
test("watch reports old and new values", () => {
  const count = state(1); let seen;
  const stop = watch(count, (next, previous) => { seen = [next, previous]; });
  count.value = 2; stop(); assert.deepEqual(seen, [2, 1]);
});
test("render supports each and if/elif/else", () => {
  const output = render("{#if score > 10}<b>high</b>{:elif score > 0}<b>low</b>{:else}<b>zero</b>{/if}<ul>{#each items as item, index}<li>{index}:{item}</li>{/each}</ul>", {score:2,items:["a","b"]});
  assert.match(output, /<b>low<\/b>/);
  assert.match(output, /<li>0:a<\/li>/);
  assert.match(output, /<li>1:b<\/li>/);
});
