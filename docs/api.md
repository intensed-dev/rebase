# Rebase API

This file documents every public feature currently implemented in the prototype.

## `compile(source)`

Compiles a string containing a Rebase single-file component.

```js
import { compile } from "./packages/compiler/src/compiler.js";

const result = compile(`
<script>
const title = "Hello";
</script>

<h1>{title}</h1>

<style>
h1 { font-family: system-ui; }
</style>
`);

console.log(result.script);
console.log(result.template);
console.log(result.style);
console.log(result.code);
```

Returns an object containing `script`, `template`, `style`, and generated `code`.

## `compileFile(input, output)`

Compiles a `.rebase` file into a JavaScript module.

```js
import { compileFile } from "./packages/compiler/src/compiler.js";

compileFile("App.rebase", "dist/App.js");
```

## `mount(component, target)`

Mounts a compiled component into a DOM element.

```js
import { mount } from "rebase";
import App from "./App.js";

mount(App, "#app");
```

The target may be a CSS selector or an existing DOM element.

## `component(definition)`

Creates an immutable component definition.

```js
import { component } from "rebase";

const Button = component({
  template: "<button>Click</button>",
  style: "button { padding: 8px; }"
});
```

## `.rebase` single-file components

A component can contain three blocks:

```html
<script>
const title = "Hello";
</script>

<main>
  <h1>{title}</h1>
</main>

<style>
h1 {
  font-family: system-ui;
}
</style>
```

The prototype extracts these blocks during compilation.

## Current limitations

- Expressions such as `{title}` are not reactive yet.
- Event handlers are not compiled yet.
- Props are not implemented yet.
- Lifecycle hooks are not implemented yet.
- Routing is not part of the current core.
- SSR is not implemented.
