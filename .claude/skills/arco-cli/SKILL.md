---
name: arco-cli
description: How to scaffold a new Arco UI project (admin dashboards, component libraries, custom templates) using the @guanzhu.me/arco-cli command-line tool, and how to author template packages that work with it. Use this skill whenever the user mentions "arco init", arco-design-pro, scaffolding an Arco project, building an Arco admin/dashboard app from scratch, authoring a custom Arco template, or debugging a failing Arco scaffolder run — even if they don't explicitly name the CLI.
---

# arco-cli

`@guanzhu.me/arco-cli` is a maintained fork of the abandoned `arco-cli` that
scaffolds Arco UI projects from npm-distributed template packages. It targets
Node.js >= 22 and ships compatibility shims so the legacy templates (notably
`arco-design-pro`) keep working on modern Node and Windows.

## When this CLI is the right tool

Reach for it when the user is starting:

- A **full admin/dashboard application** styled with Arco UI — use the Pro templates.
- A **publishable Arco component or component library** package — use the core
  templates, but note they are 3 years stale and many users will prefer to
  author their own custom template.
- A project from a **custom template package** they or their org published.

Don't reach for it when:

- The user wants a generic React/Vue starter — Vite, Next.js, create-vue, etc.
  are better fits.
- The user has an existing project and just needs Arco UI as a dependency. In
  that case it's `npm install @arco-design/web-react` (or `web-vue`) and an
  import — no scaffolder involved.

## Installation and version requirement

```bash
npm install -g @guanzhu.me/arco-cli
```

Requires Node.js >= 22. The currently maintained LTS lines are 22 and 24;
older Node versions are EOL and the CLI's `package.json` engines field
explicitly rejects them.

## CLI shape

```
arco init <projectName> [--template <pkg-or-file:path>] [--skip-install] [--skip-git]
arco add page <name>     [--type blank|table] [--root <path>]
```

### `arco init`

- `<projectName>` — directory name to create (and the default package name).
- `--template, -t` — bypass the interactive template menu; pass either an npm
  package name (`arco-design-pro`) or a `file:` path (`file:../my-template`).
- `--skip-install` — copy the template files but skip `npm install` afterwards.
- `--skip-git` — don't `git init` and don't make the initial commit.

When `--template` is passed, the only remaining prompt is "Package name"
(defaults to `<projectName>`). Without `--template`, the CLI walks an
interactive menu for template kind, framework, preset, etc.

### `arco add page`

Scaffolds a new page directory under `<root>/src/pages/<name>/` for an
arco-design-pro project. Generates `index.tsx`, `style/index.module.less`,
and `locale/index.ts` (single file with both `en-US` and `zh-CN` blocks,
matching arco-design-pro's convention). Does NOT edit `src/routes.ts` or
`src/locale/index.ts` — instead prints exact snippets to paste, since the
edit targets vary across the Vite/Next/CRA variants and Simple/Full presets.

- `<name>` must be kebab-case (`user-list`, `data-analysis`).
- `--type, -t` is `blank` (Card with title + paragraph) or `table`
  (Card + Arco `Table` with mocked columns and a "Create" primary button).
- `--root, -r` defaults to `process.cwd()`.

## Non-interactive invocation

The most useful form for agents and CI is:

```bash
arco init my-app --template <package> --skip-install --skip-git
```

This runs the template's hooks and copies files, but doesn't touch git and
doesn't run `npm install`, leaving those steps to the caller. The "Package
name" prompt still fires; if you need fully unattended execution, redirect
stdin to accept the default:

```bash
printf '\n' | arco init my-app --template arco-design-pro --skip-install --skip-git
```

## Available templates

Status as of 2026-05. Recommend Arco Pro for actual application work; for new
component/library packages, recommend Custom + a fresh template the user
authors themselves, since the official `template-core` is 3 years stale.

| Menu label                    | npm package                                | Produces                              | Last update |
| ----------------------------- | ------------------------------------------ | ------------------------------------- | ----------- |
| Arco Pro React                | `arco-design-pro` 2.8.1                    | Admin app (Next/Vite/CRA × Simple/Full) | 2024-04   |
| Arco Pro Vue                  | `arco-design-pro-vue` 2.7.3                | Admin app (Vite × Simple/Full)        | 2024-04     |
| React/Vue component           | `@arco-materials/template-core` 1.2.10     | Single Arco material npm package      | 2023-05     |
| React/Vue component library   | `@arco-materials/template-core` 1.2.10     | Multi-component Arco material library | 2023-05     |
| Team site                     | `@arco-materials/template-team-site` 1.1.1 | Internal Arco material catalog site   | 2023-05     |
| Lerna monorepo                | `@arco-materials/template-monorepo` 1.0.3  | Lerna-based monorepo for materials    | 2023-05     |
| Custom                        | (user-supplied)                            | Anything that follows the contract    | depends     |

## Custom template authoring

A template is any npm package (or `file:` directory) that arco-cli installs
into a temporary cache and either copies wholesale or invokes via a hook.
There are two forms.

### Form A — static `template/` directory

```
my-template/
├── package.json
└── template/
    ├── package.json          ← becomes the project's package.json (merged with overrides)
    ├── src/index.tsx
    ├── gitignore             ← will be renamed to .gitignore (npm strips real .gitignore on publish)
    └── README.md
```

Everything under `template/` is copied verbatim into the target project.
Files containing the placeholders below get them rewritten with values
derived from the new project's `package.json`:

- `@CONST_PACKAGE_NAME@` → `package.json["name"]`
- `@CONST_ARCO_PACKAGE_NAME@` → `@arco-design/web-react` or `@arco-design/web-vue`
  (selected from `peerDependencies.vue` presence)
- `@CONST_ARCO_DIST_CSS_NAME@` → `arco.css`

For monorepo templates, also expose `template-for-monorepo/` with the same
structure; arco-cli prefers it when the chosen template kind is `monorepo`.

### Form B — custom `.arco-cli/init.js` hook

```
my-template/
├── package.json              ← may have its own scripts (e.g. "gen:something")
└── .arco-cli/
    └── init.js
```

`.arco-cli/init.js` exports an async function that the CLI calls to do
whatever scaffolding the template needs. The CLI chdirs the process into the
template package root before calling the hook (and restores cwd afterwards),
so `process.cwd()` and any `npm run …` subprocesses see the template's own
`package.json`. The hook is invoked with one args object:

```js
module.exports = async function ({ projectPath, packageName, framework, simple, type }) {
  // projectPath is the absolute path to the new project's root.
  // The other fields depend on the template kind chosen interactively:
  //   core-* templates  → { type, packageName, projectPath }
  //   pro-react/vue     → { framework, simple, projectPath }
  //   monorepo / custom → { projectPath } (plus any user-passed overrides)
};
```

This is the form `arco-design-pro` uses; it typically `spawnSync('npm.cmd',
['run', 'gen:next', '--', '--projectPath=' + projectPath])` to delegate to
its own gen scripts.

### Optional `after-init` hook

After `npm install` finishes, arco-cli looks for either
`hook/after-init.js` or `.arco-cli/after-init.js` in the template package and
runs it with `{ root, projectName, isForMonorepo }`. Use it for post-install
steps — formatting, husky setup, generating an env file from a template, etc.

## Compatibility shims arco-cli handles for you

Three legacy-template footguns are handled automatically. Agents working with
arco-cli don't need to replicate them, but should be aware they exist:

- **Windows `.cmd` invocation.** Modern Node refuses `spawn('npm.cmd', …)`
  without `shell: true` (CVE-2024-27980). The CLI hooks
  `Module.prototype.require` so any `require('child_process')` inside template
  code receives wrapped `spawn`/`spawnSync` that auto-add `shell: true` for
  `.cmd`/`.bat` targets.
- **chdir into template root.** Template `init.js` files commonly call
  `npm run …` without a `cwd` option, expecting the working directory to be
  their own package root. The CLI chdirs there before invoking the hook and
  restores the previous cwd in `finally`, so custom templates can rely on
  `process.cwd()` being the template package root inside the hook.
- **Stale cache cleanup.** Each `arco init` removes entries older than 7 days
  from `~/.arco_template_cache/`, so killed runs don't accumulate disk usage.

If the user reports a template hook failing, the error will say "This is
likely a bug in the template package, not arco-cli" and include the hook
path. Point them at the template's repo, not at arco-cli.

## Examples

### Example 0 — add a page to an existing arco-design-pro project

User: "I'm in my arco-design-pro admin project; add a `user-list` table page."

```bash
cd my-admin
arco add page user-list --type table
```

The CLI creates `src/pages/user-list/{index.tsx, style/index.module.less,
locale/index.ts}` and prints the route + menu translation snippets to paste
into `src/routes.ts` and `src/locale/index.ts` respectively.

### Example 1 — scaffold a Pro React admin app

User: "Set up an arco-design-pro Next.js admin starter at `./admin`, don't
install dependencies yet."

```bash
arco init admin --template arco-design-pro --skip-install
```

Then in the interactive prompts: framework "Next", preset "Simple" or "Full"
depending on whether they want only the basic shell or the full set of
ready-made pages (dashboard, CRUD, profile, login, error pages).

### Example 2 — author a tiny custom template (static form)

```
my-template/
├── package.json   { "name": "my-template", "version": "0.1.0", "files": ["template"] }
└── template/
    ├── package.json   { "name": "@CONST_PACKAGE_NAME@", "version": "0.1.0" }
    ├── src/index.ts
    └── gitignore
```

Test it locally without publishing:

```bash
arco init my-app --template file:../my-template
```

### Example 3 — custom init hook

```js
// my-template/.arco-cli/init.js
const fs = require('fs');
const path = require('path');

module.exports = async function ({ projectPath, packageName }) {
  // Working directory is the template package root (arco-cli chdir'd us here).
  fs.cpSync(path.join(__dirname, '..', 'template'), projectPath, { recursive: true });
  fs.writeFileSync(
    path.join(projectPath, 'package.json'),
    JSON.stringify({ name: packageName, version: '0.1.0' }, null, 2)
  );
};
```

## Source of truth

When uncertain about exact behavior (what fields a hook receives, where the
cache lives, how a particular template kind threads its options), read the
source — the project is small and well-named:

- `src/initProject.ts` — top-level orchestrator
- `src/template.ts` — download / copy / install
- `src/templateHook.ts` — hook loading + chdir
- `src/prompts.ts` — interactive selection (clack)
- `src/patchChildProcess.ts` — Windows `.cmd` shim
- `src/utils/cache.ts` — `~/.arco_template_cache` location and TTL
