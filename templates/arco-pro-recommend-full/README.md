# @CONST_PACKAGE_NAME@

A modern Arco UI admin starter scaffolded by [@guanzhu.me/arco-cli](https://github.com/wn0x00/arco-cli).

Stack: **React 19** · **Vite 7** · **TypeScript 5** · **Arco Design 2.66** · **Zustand 5** · **react-router-dom 7**.

## Develop

```bash
npm install
npm run dev
```

The dev server runs on http://localhost:5173. A small custom Vite plugin (`vite-plugins/mock.ts`) intercepts `/api/*` requests and serves the handlers in `mock/`, so the demo pages work out of the box without a backend.

## Build

```bash
npm run build
```

## Add a page

If you've installed `@guanzhu.me/arco-cli` globally, you can scaffold new pages following the same conventions used here:

```bash
arco add page user-list --type table
```

The CLI writes `src/pages/<name>/{index.tsx, style/index.module.less, locale/index.ts}` and offers to splice the new entry into `src/routes.ts` and `src/locale/index.ts`.

## What's not included

This starter intentionally ships **without** authentication, authorization, or permission UI — keep your starter lean and add what you need. You can layer those in later via `arco add auth` / `arco add permissions` (planned).

## Project layout

```
src/
├── main.tsx              entry
├── App.tsx               <Router> + ConfigProvider for Arco theme + locale
├── routes.ts             central menu + route metadata
├── locale/index.ts       app-level translations (sidebar / common UI)
├── store/                zustand stores (theme / locale / sidebar)
├── utils/
│   ├── useLocale.ts      tiny hook that reads the active locale and returns the string map
│   └── request.ts        axios instance — add interceptors here when you wire up auth
├── components/Layout/    sidebar + header + breadcrumb shell
└── pages/                each page lives in its own directory: index.tsx + style + locale
```
