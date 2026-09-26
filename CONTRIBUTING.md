# Contributing to Rebase

## Development

Rebase requires a current Node.js release with ESM support.

```bash
npm test
npm run build
```

## Pull requests

- Keep changes focused.
- Add tests for behavior changes and bug fixes.
- Do not commit generated `dist` output.
- Explain syntax or public API changes in the pull request.

## Rebase syntax

A `.rebase` file may use `<script>`, `<template>`, and `<style>` sections in any order. Templates support `{name}`, `{#if}`, `{:elif}`, `{:else}`, `{#each}`, `on:*` event attributes, and reusable component tags.
