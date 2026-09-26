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
  if (source?.subscribe) return source.subscribe(callback);
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
  return Object.freeze({ template: "", style: "", setup: undefined, components: {}, ...definition });
}

export function mount(definition, target, options = {}) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error("Rebase: mount target not found.");
  const instance = typeof definition.setup === "function" ? definition.setup(options.props ?? {}) : { ...(options.props ?? {}) };
  let childCleanups = [];

  const render = () => {
    childCleanups.forEach(stop => stop());
    childCleanups = [];
    const active = options.router?.match?.() ?? null;
    const activeDefinition = active?.component ?? definition;
    const activeInstance = activeDefinition === definition ? instance :
      (typeof activeDefinition.setup === "function" ? activeDefinition.setup({ ...(options.props ?? {}), ...(active?.params ?? {}) }) : active?.params ?? {});
    element.innerHTML = renderTemplate(activeDefinition.template ?? "", activeInstance);
    bindEvents(element, activeInstance);
    mountChildren(element, activeDefinition.components ?? options.components ?? {}, activeInstance, childCleanups);
    if (activeDefinition.style) injectStyle(element.ownerDocument, activeDefinition.style);
  };

  render();
  const subscriptions = Object.values(instance).filter(value => value?.subscribe).map(value => value.subscribe(render));
  const routerStop = options.router?.subscribe?.(render);
  if (routerStop) subscriptions.push(routerStop);
  if (definition.style) injectStyle(element.ownerDocument, definition.style);
  definition.onMount?.(instance);

  return {
    element, instance, update: render,
    unmount() {
      subscriptions.forEach(stop => stop?.());
      childCleanups.forEach(stop => stop?.());
      definition.onUnmount?.(instance);
      element.replaceChildren();
    }
  };
}

function mountChildren(root, components, parentScope, cleanups) {
  for (const node of root.querySelectorAll("rebase-component")) {
    const name = node.dataset.component;
    const child = components[name];
    if (!child) continue;
    const props = {};
    for (const attr of [...node.attributes]) {
      if (attr.name === "data-component") continue;
      props[attr.name.replace(/^data-/, "")] = parseAttribute(attr.value, parentScope);
    }
    const placeholder = document.createElement("span");
    node.replaceWith(placeholder);
    const mounted = mount(child, placeholder, { props, components });
    cleanups.push(() => mounted.unmount());
  }
}

function parseAttribute(value, scope) {
  const expression = value.match(/^\{([\s\S]*)\}$/);
  return expression ? evaluate(expression[1], scope) : value;
}

export function createApp(definition, options = {}) {
  let current;
  return {
    mount(target) { current = mount(definition, target, options); return current; },
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

export function createRouter(routes = {}, options = {}) {
  const browser = typeof window !== "undefined";
  let currentPath = normalizePath(options.initial ?? (browser ? window.location.pathname : "/"));
  const subscribers = new Set();
  const router = {
    get path() { return currentPath; },
    match() {
      for (const [pattern, componentDefinition] of Object.entries(routes)) {
        const params = matchPath(pattern, currentPath);
        if (params) return { component: componentDefinition, params };
      }
      return null;
    },
    navigate(path) {
      const next = normalizePath(path);
      if (next === currentPath) return;
      if (browser) history.pushState({}, "", next);
      currentPath = next;
      subscribers.forEach(fn => fn(router));
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    destroy() { if (browser) removeEventListener("popstate", pop); subscribers.clear(); }
  };
  function pop() {
    currentPath = normalizePath(browser ? window.location.pathname : currentPath);
    subscribers.forEach(fn => fn(router));
  }
  if (browser) addEventListener("popstate", pop);
  return router;
}

function renderTemplate(template, scope) {
  let output = resolveEach(template, scope);
  output = resolveIf(output, scope);
  return interpolate(output, scope);
}

function resolveEach(template, scope) {
  const pattern = /\{#each\s+(.+?)\s+as\s+([A-Za-z_$][\w$]*)(?:\s*,\s*([A-Za-z_$][\w$]*))?\s*\}([\s\S]*?)\{\/each\}/g;
  return template.replace(pattern, (_, expression, itemName, indexName, body) => {
    const collection = unwrap(evaluate(expression, scope));
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
    let expression = first, cursor = 0;
    const marker = /\{:(elif)\s+(.+?)\}|\{:else\}/g;
    let match;
    while ((match = marker.exec(body))) {
      parts.push({ expression, content: body.slice(cursor, match.index) });
      expression = match[1] === "elif" ? match[2] : null;
      cursor = match.index + match[0].length;
      if (expression === null) { parts.push({ expression: null, content: body.slice(cursor) }); cursor = body.length; break; }
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
  try { return Function("scope", "with (scope) { return (" + expression + "); }")(scope); }
  catch { return ""; }
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

function matchPath(pattern, pathname) {
  const names = [];
  const regex = pattern.split("/").filter(Boolean).map(part => {
    if (part.startsWith("[") && part.endsWith("]")) {
      names.push(part.slice(1, -1)); return "([^/]+)";
    }
    if (part === "*") { names.push("wildcard"); return "(.*)"; }
    return escapeRegex(part);
  }).join("/");
  const match = new RegExp("^/" + regex + "/?$").exec(pathname);
  if (!match) return null;
  return Object.fromEntries(names.map((name, i) => [name, decodeURIComponent(match[i + 1])]));
}

function normalizePath(value) {
  return value.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}
function escapeRegex(value) { return value.replace(/[.*+?^()|[\]\\]/g, "\\$&"); }
function unwrap(value) { return value?.[stateMarker] ? value.value : value; }
function escapeHtml(value) {
  return String(unwrap(value)).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}
