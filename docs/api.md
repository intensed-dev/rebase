# Rebase API

Rebase is an experimental compiler-first JavaScript framework. This page lists the current public API in the prototype.

## \`component(definition)\`

Creates an immutable component definition.

\`\`\`js
import { component } from "rebase";

const Button = component({
  template: "<button>Click</button>",
  style: "button { padding: 8px; }"
});
\`\`\`

## \`mount(component, target)\`

Mounts a component into a CSS selector or DOM element.

\`\`\`js
import { mount } from "rebase";

const app = mount(App, "#app");
app.update();
app.unmount();
\`\`\`

## \`createApp(component)\`

Creates a small app controller.

\`\`\`js
const app = createApp(App);
const instance = app.mount("#app");
app.unmount();
\`\`\`

## \`state(initialValue)\`

Creates reactive state.

\`\`\`js
const count = state(0);

count.value++;
count.subscribe((value, previous) => {
  console.log(value, previous);
});
\`\`\`

## \`computed(getter, dependencies)\`

Creates derived reactive state.

\`\`\`js
const total = computed(
  () => price.value * quantity.value,
  [price, quantity]
);

console.log(total.value);
\`\`\`

## \`effect(fn, dependencies)\`

Runs a function immediately and again when dependencies change.

\`\`\`js
const stop = effect(
  () => console.log(count.value),
  [count]
);

stop();
\`\`\`

## \`watch(source, callback)\`

Observes reactive state or a getter.

\`\`\`js
const stop = watch(count, (value, previous) => {
  console.log("changed", previous, "→", value);
});

stop();
\`\`\`

## \`html(strings, ...values)\`

Builds an HTML string from template literals.

\`\`\`js
const name = "Rebase";
const markup = html\`<h1>Hello \${name}</h1>\`;
\`\`\`

## \`.rebase\` single-file components

Components combine JavaScript, markup and CSS:

\`\`\`html
<script>
const title = "Hello, Rebase.";

function handleClick() {
  console.log("clicked");
}
</script>

<main>
  <h1>{title}</h1>
  <button on:click="handleClick">Click</button>
</main>

<style>
main { font-family: system-ui; }
</style>
\`\`\`

The compiler extracts \`<script>\`, template markup and \`<style>\`, and exposes declared variables/functions to the component setup scope.

## Compiler

### \`compile(source)\`

Compiles a \`.rebase\` source string.

\`\`\`js
import { compile } from "./packages/compiler/src/compiler.js";

const result = compile(source);
console.log(result.script);
console.log(result.template);
console.log(result.style);
console.log(result.code);
\`\`\`

### \`compileFile(input, output)\`

Compiles a \`.rebase\` file to JavaScript.

\`\`\`js
compileFile("App.rebase", "dist/App.js");
\`\`\`

### CLI

\`\`\`bash
node packages/compiler/src/cli.js App.rebase dist/App.js
\`\`\`

## Current limitations

The prototype is not yet a full Vue/Svelte replacement. Current work is focused on a stable compiler/runtime foundation. In particular, there is no production optimizer, SSR, router, slots system, advanced template expressions, keyed list diffing, or scoped CSS yet.
