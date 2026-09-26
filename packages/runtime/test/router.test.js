import test from "node:test";
import assert from "node:assert/strict";
import { createRouter } from "../src/index.js";

test("router matches static and dynamic routes", () => {
  const router = createRouter({
    "/": {},
    "/blog/[slug]": {}
  }, { initial: "/blog/hello" });
  assert.deepEqual(router.match().params, { slug: "hello" });
  router.destroy();
});
