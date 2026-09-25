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
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
}

export function computed(getter, dependencies = []) {
  const result = state(getter());
  const stop = dependencies.map(dep => dep.subscribe(() => {
    result.value = getter();
  }));
  result.stop = () => stop.forEach(fn => fn());
  return result;
}

export function effect(fn, dependencies = []) {
  fn();
  const stops = dependencies.map(dep => dep.subscribe(() => fn()));
  return () => stops.forEach(stop => stop());
}

export function watch(source, callback) {
  if (source && typeof source.subscribe === "function") {
    return source.subscribe((value, previous) => callback(value, previous));
  }
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
  return Object.freeze({
    template: definition.template ?? "",
    style: definition.style ?? "",
    setup: definition.setup,
    ...definition
  });
}

export function mount(componentDefinition, target) {
  const element = typeof target === "string"
    ? document.querySelector(target)
    : target;
  if (!element) throw new Error("Rebase: mount target not found.");

  const instance = typeof componentDefinition.setup === "function"
    ? componentDefinition.setup()
    : {};
  const cleanups = [];
  let mounted = false;

  const render = () => {
    element.innerHTML = interpolate(componentDefinition.template, instance);
    bindEvents(element, instance);
  };

  render();

  for (const value of Object.values(instance)) {
    if (value && typeof value.subscribe === "function") {
      cleanups.push(value.subscribe(render));
    }
  }

  if (componentDefinition.style) {
    const doc = element.ownerDocument;
    let style = doc.head.querySelector('style[data-rebase]');
    if (!style) {
      style = doc.createElement("style");
      style.dataset.rebase = "";
      doc.head.appendChild(style);
    }
    style.textContent += componentDefinition.style + "\n";
  }

  mounted = true;
  componentDefinition.onMount?.(instance);

  return {
    element,
    instance,
    update: render,
    unmount() {
      if (!mounted) return;
      mounted = false;
      cleanups.forEach(stop => stop());
      componentDefinition.onUnmount?.(instance);
      element.replaceChildren();
    }
  };
}

export function createApp(componentDefinition) {
  let current = null;
  return {
    mount(target) {
      current = mount(componentDefinition, target);
      return current;
    },
    unmount() {
      current?.unmount();
      current = null;
    }
  };
}

export function html(strings, ...values) {
  return strings.reduce((result, part, index) =>
    result + part + (index < values.length ? String(unwrap(values[index])) : ""), "");
}

function unwrap(value) {
  return value && value[stateMarker] ? value.value : value;
}

function interpolate(template, scope) {
  return template.replace(/\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (_, key) =>
    escapeHtml(unwrap(scope[key]) ?? ""));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function bindEvents(element, scope) {
  for (const node of element.querySelectorAll("*")) {
    for (const attribute of [...node.attributes]) {
      if (!attribute.name.startsWith("on:")) continue;
      const event = attribute.name.slice(3);
      const handler = scope[attribute.value];
      node.removeAttribute(attribute.name);
      if (typeof handler === "function") node.addEventListener(event, handler);
    }
  }
}

export { stateMarker };
