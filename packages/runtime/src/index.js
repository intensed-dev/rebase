export function mount(component, target) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!element) throw new Error("Rebase: mount target not found.");
  element.innerHTML = component.template ?? "";
  if (component.style) {
    const style = document.createElement("style");
    style.textContent = component.style;
    style.dataset.rebase = "";
    document.head.appendChild(style);
  }
  return { element, unmount() { element.replaceChildren(); } };
}
export function component(definition) { return Object.freeze({ ...definition }); }