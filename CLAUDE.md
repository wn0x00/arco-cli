# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A maintained fork of the abandoned `arco-cli`, published as `@guanzhu.me/arco-cli`. It scaffolds Arco UI projects from npm-distributed template packages (notably `arco-design-pro` for admin dashboards). The CLI's job is to download a template, copy or invoke its content into a target directory, install dependencies, and make an initial git commit.

Public interface: `arco init <projectName> [--template <pkg-or-file:path>] [--skip-install] [--skip-git]`.

A more detailed user/agent-facing reference lives in `.claude/skills/arco-cli/SKILL.md` — read it for template authoring conventions, the full template list with maintenance status, and example invocations.

## Commands

| Task | Command |
| --- | --- |
| Install deps | `yarn install` |
| Build TS → `lib/` | `yarn build` |
| Watch build | `yarn dev` |
| Lint | `yarn lint` |
| Format | `yarn format` |
| Test (auto-builds first via `pretest: tsc`) | `yarn test` |
| Run a single test file | `yarn test src/templateHook.test.ts` |
| Run a single test by name | `yarn test -t "chdirs into the template package root"` |
| Smoke the built CLI | `node lib/bin.js --help` |

The `pretest` hook runs `tsc` because the e2e portion of `templateHook.test.ts` spawns a child Node process that requires the compiled `lib/` directly. Skipping the build will leave that test referencing stale or missing artifacts.

Node.js >= 22 is required (`engines.node` enforces this); CI runs on the matrix of Node 22+24 × Ubuntu+Windows.

## Architecture

The implementation is split by responsibility — keep modules focused when adding to them:

- `src/bin.ts` — argv parsing via commander, the npm `bin` entrypoint
- `src/initProject.ts` — top-level orchestrator; chains prompts → template → project transforms → git
- `src/prompts.ts` — interactive selection menus (clack)
- `src/template.ts` — download into `~/.arco_template_cache/<timestamp>/` then copy or invoke hook
- `src/project.ts` — package.json merge, `@CONST_*@` placeholder rewrite, `gitignore`→`.gitignore` rename, initial git commit
- `src/templateHook.ts` — load and invoke `init.js` / `after-init.js`; chdir into template root for the call
- `src/patchChildProcess.ts` — Windows-only `Module.prototype.require` hook that returns a wrapped `child_process` to template code
- `src/banner.ts` — ASCII banner printed before the clack `intro`
- `src/utils/{exec,cache,clack}.ts` — shell helper, template-cache TTL sweep, lazy ESM loader for clack

### Three non-obvious things to know

**1. `@clack/prompts` is ESM-only and we are CommonJS.**
`src/utils/clack.ts` loads it via `new Function('specifier', 'return import(specifier)')` to bypass TypeScript's down-leveling of `import()` to `require()` under `module: CommonJS`. Don't replace this with a plain dynamic import — TS will lower it and you'll get a runtime crash on ESM-only modules. Don't reach for `import` from `'@clack/prompts'` either; it has no CJS export. Always go through `await clack()`.

**2. Templates expect cwd = template root, not user shell cwd.**
`runTemplateHook` in `src/templateHook.ts` `process.chdir`s into the template package root before invoking the hook and restores the previous cwd in `finally`. This is load-bearing: legacy templates like `arco-design-pro` `spawnSync('npm.cmd', ['run', 'gen:next', ...])` with no `cwd` option, so npm needs to find the template's own `package.json` via process cwd. If you change how hooks are invoked, preserve this behavior or those templates break.

**3. The `child_process` patch only applies to template code, not the CLI's own `child_process` use.**
`patchChildProcessForWindows` swaps `child_process` exports seen via `Module.prototype.require`, so templates `require('child_process').spawnSync(...)` get our wrapper that auto-injects `shell: true` for `.cmd`/`.bat`. The CLI's own imports (`import { spawn } from 'child_process'` at top of files) resolved before the patch ran and use the original — but they always pass `shell: true` explicitly already, so the difference is invisible. Jest's module loader bypasses `Module.prototype.require` entirely; tests that need to exercise the patched path do so via a child Node subprocess, not via jest's own `require`.

## Release flow

Releases are tag-driven: tag `v*.*.*` triggers `.github/workflows/publish-npm.yml`, which uses npm Trusted Publishing (OIDC, no `NPM_TOKEN`) and publishes with `--provenance`. The package's `repository.url` must match the GitHub repo URL or the provenance bundle is rejected by the registry.

Bump `version` in `package.json`, commit, tag, push:

```bash
git tag -a v0.3.3 -m "Release v0.3.3" && git push origin v0.3.3
```

The `prepublishOnly` script runs `npm run build`, so `lib/` is always rebuilt during publish — don't commit `lib/`.

## Known upstream landmines

The official Arco template packages (`arco-design-pro`, `@arco-materials/template-*`) are unmaintained — last publish dates are 2024-04 (pro) and 2023-05 (template-core, team-site, monorepo). When a `runTemplateHook` failure surfaces "This is likely a bug in the template package, not arco-cli", that's accurate; arco-cli's job ends at running the hook. Patch fixes belong upstream (or in a custom template) — don't try to special-case template behavior inside arco-cli unless it's a generic compatibility shim like the Windows `.cmd` one.
