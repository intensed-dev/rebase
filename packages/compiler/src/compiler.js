import fs from "node:fs";
import path from "node:path";

export function compile(source) {
  const script = source.match(/<script[^>]*>([\\s\\S]*?)<\\/script>/i)?.[1]?.trim() ?? "";
  const style = source.match(/<style[^>]*>([\\s\\S]*?)<\\/style>/i)?.[1]?.trim() ?? "";
  const template = source
    .replace(/<script[^>]*>[\\s\\S]*?<\\/script>/gi, "")
    .replace(/<style[^>]*>[\\s\\S]*?<\\/style>/gi, "")
    .trim();

  const names = [
    ...[...script.matchAll(/(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)/g)].map(m => m[1]),
    ...[...script.matchAll(/function\\s+([A-Za-z_$][\\w$]*)/g)].map(m => m[1])
  ];
  const returned = [...new Set(names)];

  const code = [
    'import { component } from "rebase";',
    'export default component({',
    `  setup() {\\n    ${script.replace(/\\n/g, "\\n    ")}\\n    return { ${returned.join(", ")} };\\n  },`,
    `  template: ${JSON.stringify(template)},`,
    `  style: ${JSON.stringify(style)}`,
    '});'
  ].join("\\n");

  return { script, template, style, code };
}

export function compileFile(input, output) {
  const result = compile(fs.readFileSync(input, "utf8"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, result.code + "\n");
  return result;
}
