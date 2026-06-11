# Story 1.1: Scaffold, hosting alignment, and SPA reload safety

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **deployer**,
I want **the Vite React TS app built with Tailwind + shadcn/ui and correct GitHub Pages base configuration**,
so that **static hosting and shared deep links work reliably**.

## Acceptance Criteria

1. **Given** a fresh repo scaffold **when** the project is configured for GitHub Pages **then** `vite.config` uses a `base` path that matches the GitHub Pages project-site URL (e.g. `/oneshot/` for `https://<user>.github.io/oneshot/`).
2. **Given** the app uses client-side history routing **when** React Router is wired **then** `BrowserRouter` (or equivalent) receives a **`basename`** that matches the same path as Vite `base`, sourced from a **single shared module** (e.g. `src/lib/config.ts`) — not duplicated literals in multiple files. [Source: `_bmad-output/planning-artifacts/architecture.md` — Implementation sequence, Enforcement Guidelines]
3. **Given** a production build **when** assets are emitted to `dist/` **then** **`404.html` is a copy of `index.html`** in `dist` (post-build step or equivalent) so that **reloading a deep link** on GitHub Pages serves the SPA instead of a static 404. [Source: `_bmad-output/planning-artifacts/architecture.md` — GitHub Pages alignment]
4. **Given** the deployment target **when** someone runs `npm run build` and deploys `dist` **then** the app **loads at the Pages base URL** and **navigating directly to a deep route (e.g. `/play`) and refreshing** does not show GitHub Pages’ generic 404 (the SPA bootstraps and the router handles the path).
5. **Given** public build-time variables **when** documented **then** `.env.example` lists any **`VITE_*`** variables used (e.g. future Deezer public app id), satisfying **NFR-S2** (no disallowed secrets; only public, documented vars). [Source: `_bmad-output/planning-artifacts/prd.md` — NFR-S2; epics Additional Requirements]

**BDD (from epics):**

- **Given** a fresh repo scaffold
- **When** the project is configured for GitHub Pages (including `vite.config` `base`, Router `basename` from shared `config`, and `404.html` copy from `index.html` in `dist`)
- **Then** production builds load at the Pages URL and reloading a deep link does not 404
- **And** `.env.example` documents any `VITE_*` public variables (NFR-S2)

## Tasks / Subtasks

- [ ] **Scaffold** — Create Vite app with `react-ts` template; add TypeScript strictness as reasonable. [Source: architecture — Starter Template]
- [ ] **Styling stack** — Add Tailwind CSS per current Vite docs; run **shadcn/ui** init (or equivalent Radix + Tailwind wiring) so `components.json` and `src/components/ui/` pattern exists. [Source: epics Additional Requirements, UX spec §1.1]
- [ ] **Routing** — Add **React Router** (v7 line on npm — pin **latest stable** in `package.json` at install time). [Source: architecture — Frontend Architecture]
- [ ] **Single source of base path** — Add `src/lib/config.ts` exporting the **app base path** (e.g. `export const APP_BASE = import.meta.env.BASE_URL` or a constant derived from one env) consumed by:
  - [ ] Vite `defineConfig({ base: ... })` — prefer reading from env (e.g. `VITE_BASE_PATH` or document using `base` tied to repo name) so CI and local `preview` stay consistent.
  - [ ] Router: `<BrowserRouter basename={...}>` using the **same** value as Vite’s effective base.
- [ ] **SPA fallback for Pages** — Add npm script e.g. `"build": "vite build && cp dist/index.html dist/404.html"` (Unix; document Windows alternative or use `shx`/`cpy-cli` if cross-platform is required). Verify `404.html` exists in `dist` after build.
- [ ] **Env documentation** — Create `.env.example` with commented `VITE_*` placeholders (even if only `VITE_BASE_PATH` or Deezer placeholder for later stories); no secrets.
- [ ] **CI placeholder (optional but recommended)** — Add `.github/workflows/` workflow skeleton that runs `npm ci` + `npm run build` so Pages deploy can attach later — matches architecture “GitHub Actions” note. [Source: architecture — Infrastructure & Deployment]
- [ ] **Smoke** — After `npm run build` + `npm run preview` with `base` set, manually hit a deep path and reload; on real Pages, confirm deep link + reload.

## Dev Notes

### Architecture compliance

- **Critical:** **Vite `base`**, **Router `basename`**, and **GitHub Pages project path** must stay **one conceptual path** — architecture explicitly requires alignment end-to-end. [Source: `architecture.md` — GitHub Pages alignment, Enforcement Guidelines]
- **No feature code in this story** for playlist codec or Deezer — only scaffold + hosting + router shell enough to prove reload safety (placeholder route is fine).
- **Project structure** should follow the architecture tree: `src/app/` for providers + routes, `src/lib/config.ts`, `src/features/*` as empty or stub pages later. [Source: `architecture.md` — Project Structure]

### Technical requirements

| Requirement | Implementation |
|-------------|----------------|
| GitHub Pages project site | `base` is typically **`/<repository-name>/`** (trailing slash per Vite convention). |
| Deep link reload | **`404.html` = `index.html`** in `dist` after build. |
| Single basename | **`src/lib/config.ts`** (or `env.ts`) exported constant; router and docs reference it. |
| HTTPS | GitHub Pages provides TLS (NFR-S1). |
| NFR-S2 | Document **only** public `VITE_*` in `.env.example`; never commit private API keys. |

### Library / framework requirements

- **Vite** + **React** + **TypeScript** — `npm create vite@latest` with `react-ts`. [Source: architecture]
- **Tailwind CSS** + **shadcn/ui** (Radix) — per PRD/epics/UX.
- **React Router** — v7 npm line; pin exact version in `package.json` at install.
- **Node** — Use **20.x LTS** or **22.x** per current Vite upstream requirements at install time.
- **Package manager** — Prefer `npm` with lockfile committed unless repo already standardizes on `pnpm` (greenfield: `npm` is fine).

### File structure requirements

Align with architecture (adjust names if needed, keep boundaries):

- `vite.config.ts` — `base` from shared config pattern or env.
- `src/lib/config.ts` — basename / public app config.
- `src/app/providers.tsx`, `src/app/routes.tsx` — Router + route table stub.
- `index.html`, `public/` — static assets.
- `.env.example`, `.gitignore` (include `dist/`, `.env.local`).

Do **not** add a second mechanism for base path (no hardcoded `basename` in a component that differs from Vite).

### Testing requirements

- **Vitest** + **Testing Library** are not mandated by this story alone; add when first unit tests appear (Epic 1 later stories or per team preference). If added now, co-locate `*.test.ts(x)` per architecture.
- **Manual QA** for this story: production build, preview or Pages deploy, **reload on deep URL**.

### Project structure notes

- Greenfield: **no existing `vite.config`** in repo — implement full scaffold from architecture handoff: *“Run npm create vite… add Tailwind + shadcn, wire config.ts (base/basename), SPA 404 copy”*. [Source: architecture — Implementation Handoff]

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` — Epic 1, Story 1.1]
- [Source: `_bmad-output/planning-artifacts/architecture.md` — Starter Template, GitHub Pages alignment, `src/lib/config.ts`, Implementation sequence step 1]
- [Source: `_bmad-output/planning-artifacts/prd.md` — NFR-S1, NFR-S2, NFR-SC1, Web App / deployment]
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md` — Design System Foundation §1.1 Tailwind + Radix/shadcn]

## Previous story intelligence

_Not applicable — this is the first story in Epic 1 (1-1)._

## Git intelligence summary

_Not available — workspace is not a git repository in this environment. After first commits, prefer small focused commits for scaffold vs. hosting config for easier review._

## Latest technical information

- **GitHub Pages + SPA:** Serving `404.html` copies of the SPA entry is the standard approach when the host cannot rewrite all routes to `index.html`; ensure `404.html` is **byte-identical** to `index.html` for Vite’s default output (simple `cp` post-build is the usual pattern).
- **Vite `base`:** Must match the deployed subpath; asset URLs in the built bundle depend on it. Mismatch causes broken JS/CSS on Pages.
- **React Router v7:** `BrowserRouter` accepts `basename`; keep it in sync with `import.meta.env.BASE_URL` in many setups — verify `BASE_URL` ends with `/` and matches router expectations.

## Project context reference

_No `project-context.md` found in repo — follow architecture and this story as the source of truth._

## Story completion status

- **Status:** `ready-for-dev`
- **Completion note:** Ultimate context engine analysis completed — comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

_(To be filled by dev agent)_

### Debug Log References

### Completion Notes List

### File List

_(To be filled by dev agent)_
