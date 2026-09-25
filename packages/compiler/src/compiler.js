export function compile(source) {
  const script = source.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]?.trim() ?? "";
  const style = source.match(/<style[^>]*>([\s\S]*?)<\/style>/i)?.[1]?.trim() ?? "";
  const template = source.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").trim();
  return { script, template, style, code: `const __template = ${JSON.stringify(template)};\nconst __style = ${JSON.stringify(style)};\nexport default { template: __template, style: __style };` };
}
export function compileFile(input, output) {
  const fs = require("node:fs");
  const path = require("node:path");
  const result = compile(fs.readFileSync(input, "utf8"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, result.code + "\n");
  return result;
}