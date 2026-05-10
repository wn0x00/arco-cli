# @guanzhu.me/arco-cli

Initialize projects from selectable Arco templates. A maintained fork of the
unmaintained `arco-cli`, kept compatible with current Node.js LTS.

## Requirements

- Node.js **>= 22** (the currently supported LTS lines: 22 and 24)

## Install

```bash
npm install -g @guanzhu.me/arco-cli
```

## Usage

```bash
arco init my-app
```

Use the bundled modern starter (skips the menu):

```bash
arco init my-app --template pro-recommend          # full preset (default)
arco init my-app --template pro-recommend:simple   # simple preset
```

Use a specific template package:

```bash
arco init my-app --template arco-design-pro
```

Use a local template:

```bash
arco init my-app --template file:../my-template
```

Skip dependency install or git init:

```bash
arco init my-app --skip-install --skip-git
```

## Adding a page to an existing arco-design-pro project

Run from the project root (the directory containing `src/pages/`):

```bash
arco add page user-list --type table
arco add page settings --type blank
```

This scaffolds `src/pages/<name>/` with `index.tsx`, `style/index.module.less`,
and `locale/index.ts` following arco-design-pro's conventions.

If `src/routes.ts` and `src/locale/index.ts` are present and follow arco-design-pro's
shape, the CLI also runs an **interactive placement picker** — choose to place
the new page at the menu root, under any existing top-level group, or create
a new top-level menu group on the fly — and edits both files for you. If
either source file is missing or has a non-standard shape, the CLI falls back
to printing the exact snippets you need to paste in.

`--type` accepts `blank` (a Card with title + paragraph) or `table` (a Card
with header, primary action, and Arco `Table`).

## Template structure

A template is just an npm package (or a local directory) that contains either:

- a `template/` directory whose contents are copied verbatim, or
- a `.arco-cli/init.js` script exporting an async function that runs custom
  initialization logic

Optional `hook/after-init.js` or `.arco-cli/after-init.js` is invoked after
dependency installation.

## Notes

This CLI ships a small `child_process` compatibility shim so older templates
(e.g. `arco-design-pro`) that call `spawnSync('npm.cmd', ...)` directly still
work on Node versions that enforce the BatBadBut (CVE-2024-27980) fix.
