import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compiler.js";

test("compiles sections in any order", () => {
  const result = compile("<style>.app { color: red; }</style><template><p>{message}</p></template><script>const message = \"hello\";</script>");
  assert.equal(result.template, "<p>{message}</p>");
  assert.equal(result.style, ".app { color: red; }");
  assert.match(result.code, /return \{ message \};/);
});

test("rewrites .rebase imports and custom components", () => {
  const result = compile("<script>import Card from \"./Card.rebase\";</script><template><Card title=\"Hello\" /></template>");
  assert.match(result.code, /from \"\.\/Card\.js\"/);
  assert.match(result.code, /data-component=\"Card\"/);
});

test("keeps each/if syntax for the runtime", () => {
  const result = compile("<template>{#if ok}<p>{#each items as item}{item}{/each}</p>{:else}<p>no</p>{/if}</template><script>const ok=true; const items=[1,2];</script>");
  assert.match(result.template, /#each/);
  assert.match(result.template, /#if/);
});
