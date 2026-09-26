# AGENTS.md

## Project model

Rebase is a compiler-first JavaScript framework. Keep the compiler and runtime dependency-free and browser-oriented.

## Structure

- `packages/compiler` — .rebase parsing, code generation, and CLI
- `packages/runtime` — reactive state, rendering, events, components, and routing
- `packages/rebase` — public package entry point
- `packages/*/test` — Node test suite

## Development rules

- Preserve ESM syntax.
- Do not add a runtime dependency for functionality that can be implemented with platform APIs.
- Keep generated JavaScript readable.
- Add a regression test for compiler/runtime bugs.
- Do not commit generated `dist` output.
