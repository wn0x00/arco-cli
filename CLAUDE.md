# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A maintained fork of the abandoned `arco-cli`, published as `@guanzhu.me/arco-cli`. It scaffolds Arco UI projects from npm-distributed template packages (notably `arco-design-pro` for admin dashboards) and offers small everyday helpers for working inside the resulting project.

Public interface:
- `arco init <projectName> [--template <pkg-or-file:path>] [--skip-install] [--skip-git]`
- `arco add page <name> [--type blank|table] [--root <path>]`
- `arco dev [--root <path>] [-- ...forwarded-args]`

A more detailed user/agent-facing reference lives in `.claude/skills/arco-cli/SKILL.md` — read it for template authoring conventions, the full template list with maintenance status, and example invocations.

## Commands

| Task | Command |
| --- | --- |
| Install deps | `yarn install` |
| Build TS → `lib/` | `yarn build` |
| Watch build | `yarn dev` |
| Lint | `yarn lint` |
| Format | `yarn format` |
| Test | `yarn test` |
| Run a single test file | `node --import tsx --test src/init/templateHook.test.ts` |
| Run a single test by name | `node --import tsx --test --test-name-pattern="chdirs into" src/init/templateHook.test.ts` |
| Smoke the built CLI | `node lib/bin.js --help` |

`yarn test` runs `node scripts/test.mjs`, which globs `src/**/*.test.ts` itself (so Git Bash on Windows doesn't trip on `**`) and shells out to `node --import tsx --test`. We use Node's built-in test runner (`node:test` + `node:assert/strict`) — no jest, no ts-jest. tsx is the only test-time dep keeping us TS-native.

Node.js >= 22 is required (`engines.node` enforces this); CI runs on the matrix of Node 22+24 × Ubuntu+Windows.

## Architecture

The source tree is grouped by responsibility — every CLI subcommand has a thin orchestrator under `src/commands/` that wires together engines from a sibling directory:

```
src/
├── bin.ts                  # commander argv parsing, the npm `bin` entrypoint
├── banner.ts               # ASCII banner shared across commands
├── commands/               # one file per `arco` subcommand
│   ├── init.ts
│   ├── addPage.ts
│   └── dev.ts
├── init/                   # init engine: prompts, template install, project transforms
│   ├── prompts.ts
│   ├── template.ts
│   ├── project.ts
│   ├── templateHook.ts     # load + chdir for init.js / after-init.js
│   └── patchChildProcess.ts # Windows .cmd shim
├── addPage/                # add-page engine
│   ├── scaffold.ts         # pure file IO; the unit-tested core
│   ├── routesEdit.ts       # eval-and-rewrite arco-design-pro's src/routes.ts
│   └── localeEdit.ts       # splice menu.* into src/locale/index.ts
└── utils/                  # cross-cutting infra
    ├── exec.ts             # spawn helper
    ├── cache.ts            # ~/.arco_template_cache TTL sweep
    └── clack.ts            # lazy ESM loader for @clack/prompts
```

When adding a new subcommand: put the orchestrator in `src/commands/`, its engine modules in a sibling directory named after the command, and only escalate to `utils/` for things you'd reuse from a third command.

### Three non-obvious things to know

**1. `@clack/prompts` is ESM-only and we are CommonJS.**
`src/utils/clack.ts` loads it via `new Function('specifier', 'return import(specifier)')` to bypass TypeScript's down-leveling of `import()` to `require()` under `module: CommonJS`. Don't replace this with a plain dynamic import — TS will lower it and you'll get a runtime crash on ESM-only modules. Don't reach for `import` from `'@clack/prompts'` either; it has no CJS export. Always go through `await clack()`.

**2. Templates expect cwd = template root, not user shell cwd.**
`runTemplateHook` in `src/init/templateHook.ts` `process.chdir`s into the template package root before invoking the hook and restores the previous cwd in `finally`. This is load-bearing: legacy templates like `arco-design-pro` `spawnSync('npm.cmd', ['run', 'gen:next', ...])` with no `cwd` option, so npm needs to find the template's own `package.json` via process cwd. If you change how hooks are invoked, preserve this behavior or those templates break.

**3. The `child_process` patch only applies to template code, not the CLI's own `child_process` use.**
`patchChildProcessForWindows` swaps `child_process` exports seen via `Module.prototype.require`, so templates `require('child_process').spawnSync(...)` get our wrapper that auto-injects `shell: true` for `.cmd`/`.bat`. The CLI's own imports resolve before the patch runs and keep the original — but they always pass `shell: true` explicitly anyway, so the difference is invisible in normal flows. Tests that need to exercise the patched path do so by spawning a fresh Node subprocess (the in-process test runner shares Module state with our patch and the assertions become unreliable).

## Release flow

Releases are tag-driven: tag `v*.*.*` triggers `.github/workflows/publish-npm.yml`, which uses npm Trusted Publishing (OIDC, no `NPM_TOKEN`) and publishes with `--provenance`. The package's `repository.url` must match the GitHub repo URL or the provenance bundle is rejected by the registry.

Bump `version` in `package.json`, commit, tag, push:

```bash
git tag -a v0.6.0 -m "Release v0.6.0" && git push origin v0.6.0
```

The `prepublishOnly` script runs `npm run build`, so `lib/` is always rebuilt during publish — don't commit `lib/`.

## Known upstream landmines

The official Arco template packages (`arco-design-pro`, `@arco-materials/template-*`) are unmaintained — last publish dates are 2024-04 (pro) and 2023-05 (template-core, team-site, monorepo). When a `runTemplateHook` failure surfaces "This is likely a bug in the template package, not arco-cli", that's accurate; arco-cli's job ends at running the hook. Patch fixes belong upstream (or in a custom template) — don't try to special-case template behavior inside arco-cli unless it's a generic compatibility shim like the Windows `.cmd` one.
