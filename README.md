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
