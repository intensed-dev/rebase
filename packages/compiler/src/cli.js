#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { compileFile } from "./compiler.js";

const [input, output = input.replace(/\\.rebase$/i, ".js")] = process.argv.slice(2);
if (!input) {
  console.error("Usage: rebase <input.rebase> [output.js]");
  process.exit(1);
}
compileFile(input, output);
console.log(`Compiled ${path.resolve(input)} -> ${path.resolve(output)}`);
