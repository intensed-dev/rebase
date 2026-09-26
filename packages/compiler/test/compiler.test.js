import test from "node:test";
import assert from "node:assert/strict";
import { compile } from "../src/compiler.js";

test("compiles Vue-style sections in any order", () => {
  const result = compile(`
    <style>.app { color: red; }</style>
    <template><p>{message}</p></template>
    <script>const message = "hello";</script>
  `);
  assert.equal(result.template, "<p>{message}</p>");
  assert.equal(result.style, ".app { color: red; }");
  assert.match(result.code, /return \\{ message \\};/);
});

test("rewrites .rebase imports and custom components", () => {
  const result = compile(`
    <script>import Card from "./Card.rebase";</script>
    <template><Card title="Hello" /></template>
  `);
  assert.match(result.code, /from "\\.\\/Card\\.js"/);
  assert.match(result.code, /data-component=\\\"Card\\\"/);
});
