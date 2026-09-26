const stateMarker = Symbol("rebase.state");

export function state(initialValue) {
  let value = initialValue;
  const subscribers = new Set();
  return {
    [stateMarker]: true,
    get value() { return value; },
    set value(next) {
      const previous = value;
      value = typeof next === "function" ? next(value) : next;
      if (Object.is(previous, value)) return;
      subscribers.forEach(fn => fn(value, previous));
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); }
  };
}

export function computed(getter, dependencies = []) {
  const result = state(getter());
  const stops = dependencies.map(dep => dep.subscribe(() => { result.value = getter(); }));
  result.stop = () => stops.forEach(stop => stop());
  return result;
}

export function effect(fn, dependencies = []) {
  fn();
  const stops = dependencies.map(dep => dep.subscribe(fn));
  return () => stops.forEach(stop => stop());
}

export function watch(source, callback) {
  if (source && typeof source.subscribe === "function") return source.subscribe(callback);
  let previous = source();
  return effect(() => {
    const next = source();
    if (!Object.is(next, previous)) {
      const old = previous;
      previous = next;
      callback(next, old);
    }
  });
}

export function component(definition = {}) {
  return Object.freeze({ template: "", style: "", setup: undefined, ...definition });
}

export function mount(definition, target) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error("Rebase: mount target not found.");
  const instance = typeof definition.setup === "function" ? definition.setup() : {};
  const render = () => {
    element.innerHTML = renderTemplate(definition.template, instance);
    bindEvents(element, instance);
  };
  render();
  const cleanups = Object.values(instance)
    .filter(value => value && typeof value.subscribe === "function")
    .map(value => value.subscribe(render));
  if (definition.style) injectStyle(element.ownerDocument, definition.style);
  definition.onMount?.(instance);
  return {
    element, instance, update: render,
    unmount() {
      cleanups.forEach(stop => stop());
      definition.onUnmount?.(instance);
      element.replaceChildren();
    }
  };
}

export function createApp(definition) {
  let current;
  return {
    mount(target) { current = mount(definition, target); return current; },
    unmount() { current?.unmount(); current = undefined; }
  };
}

export function render(template, scope = {}) {
  return renderTemplate(template, scope);
}

export function html(strings, ...values) {
  return strings.reduce((result, part, index) =>
    result + part + (index < values.length ? String(unwrap(values[index])) : ""), "");
}

function renderTemplate(template, scope) {
  let output = resolveEach(template, scope);
  output = resolveIf(output, scope);
  output = interpolate(output, scope);
  return output;
}

function resolveEach(template, scope) {
  const pattern = /\{#each\s+(.+?)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?\s*\}([\s\S]*?)\{\/each\}/g;
  return template.replace(pattern, (_, expression, itemName, indexName, body) => {
    const collection = evaluate(expression, scope);
    if (!collection || typeof collection[Symbol.iterator] !== "function") return "";
    return [...collection].map((item, index) => {
      const child = { ...scope, [itemName]: item };
      if (indexName) child[indexName] = index;
      return renderTemplate(body, child);
    }).join("");
  });
}

function resolveIf(template, scope) {
  return template.replace(/\{#if\s+(.+?)\}([\s\S]*?)\{\/if\}/g, (_, first, body) => {
    const parts = [];
    let expression = first;
    let cursor = 0;
    const marker = /\{:(elif)\s+(.+?)\}|\{:else\}/g;
    let match;
    while ((match = marker.exec(body))) {
      parts.push({ expression, content: body.slice(cursor, match.index) });
      expression = match[1] === "elif" ? match[2] : null;
      cursor = match.index + match[0].length;
      if (expression === null) {
        parts.push({ expression: null, content: body.slice(cursor) });
        cursor = body.length;
        break;
      }
    }
    if (cursor < body.length) parts.push({ expression, content: body.slice(cursor) });
    const selected = parts.find(part => part.expression === null || evaluate(part.expression, scope));
    return selected ? renderTemplate(selected.content, scope) : "";
  });
}

function interpolate(template, scope) {
  return template.replace(/\{\s*([^{}]+?)\s*\}/g, (_, expression) =>
    /^[#:\/]/.test(expression) ? "{" + expression + "}" : escapeHtml(evaluate(expression, scope) ?? "")
  );
}

function evaluate(expression, scope) {
  try {
    return Function("scope", "with (scope) { return (" + expression + "); }")(scope);
  } catch {
    return "";
  }
}

function bindEvents(element, scope) {
  for (const node of element.querySelectorAll("*")) {
    for (const attribute of [...node.attributes]) {
      if (!attribute.name.startsWith("on:")) continue;
      const event = attribute.name.slice(3);
      const handler = attribute.value.replace(/^\{|\}$/g, "").trim();
      node.removeAttribute(attribute.name);
      node.addEventListener(event, eventObject => {
        if (typeof scope[handler] === "function") scope[handler](eventObject);
        else evaluate(handler, { ...scope, event: eventObject });
      });
    }
  }
}

function injectStyle(document, css) {
  let style = document.head.querySelector("style[data-rebase]");
  if (!style) {
    style = document.createElement("style");
    style.dataset.rebase = "";
    document.head.appendChild(style);
  }
  if (!style.textContent.includes(css)) style.textContent += css + "\n";
}

function unwrap(value) { return value && value[stateMarker] ? value.value : value; }
function escapeHtml(value) {
  return String(unwrap(value))
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export { stateMarker };
