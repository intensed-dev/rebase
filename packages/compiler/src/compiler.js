import fs from "node:fs";
import path from "node:path";

const RESERVED = new Set(["const","let","var","function","return","if","else","for","while","class","import","export","from"]);

export function compile(source) {
  const sections = extractSections(source);
  const imports = [...sections.script.matchAll(/^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm)]
    .map(m => ({ statement: m[0].trim(), specifier: m[1].trim(), source: m[2] }));

  let setup = sections.script;
  for (const item of imports) setup = setup.replace(item.statement, "");
  setup = setup.trim();

  const bindings = collectBindings(setup);
  const importCode = imports.map(item => {
    const source = item.source.endsWith(".rebase") ? item.source.slice(0, -7) + ".js" : item.source;
    return `import ${item.specifier} from ${JSON.stringify(source)};`;
  });

  const componentNames = imports
    .map(item => item.specifier.match(/^(?:\{\s*)?([A-Za-z_$][\w$]*)/)?.[1])
    .filter(Boolean);

  const code = [
    ...importCode,
    'import { component } from "rebase";',
    "export default component({",
    "  setup() {",
    indent(setup),
    `    return { ${bindings.join(", ")} };`,
    "  },",
    `  template: ${JSON.stringify(transformComponents(sections.template))},`,
    `  style: ${JSON.stringify(sections.style)},`,
    `  components: { ${componentNames.map(name => `${name}: ${name}`).join(", ")} }`,
    "});"
  ].join("\n");

  return { ...sections, imports, bindings, code };
}

export function compileFile(input, output) {
  const result = compile(fs.readFileSync(input, "utf8"));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, result.code + "\n");
  return result;
}

function extractSections(source) {
  const blocks = [...source.matchAll(/<(script|template|style)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)];
  const sections = { script: "", template: "", style: "" };
  for (const match of blocks) sections[match[1].toLowerCase()] = match[2].trim();
  if (!blocks.some(m => m[1].toLowerCase() === "template")) {
    sections.template = source
      .replace(/<(script|style)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi, "")
      .trim();
  }
  return sections;
}

function collectBindings(script) {
  const names = new Set();
  for (const match of script.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of script.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) names.add(match[1]);
  return [...names].filter(name => !RESERVED.has(name));
}

function transformComponents(template) {
  return template
    .replace(/<([A-Z][A-Za-z0-9_$-]*)(\s[^>]*)?\s*\/\s*>/g,
      '<rebase-component data-component="$1"$2></rebase-component>')
    .replace(/<([A-Z][A-Za-z0-9_$-]*)(\s[^>]*)>([\s\S]*?)<\/\1>/g,
      '<rebase-component data-component="$1"$2>$3</rebase-component>');
}

function indent(value) {
  return value ? value.split("\n").map(line => "    " + line).join("\n") : "    // no script";
}
