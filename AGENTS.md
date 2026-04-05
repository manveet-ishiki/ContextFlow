# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the extension code. The React side panel lives in `src/sidepanel/` with UI components under `components/` and hooks under `hooks/`. Chrome-facing logic is split into `src/background/` for the MV3 service worker and `src/api/` for tab, sync, search, and context operations. Shared helpers live in `src/lib/`, database setup is in `src/db.ts`, and shared types/messages are in `src/types.ts` and `src/messages.ts`. Static extension assets and the manifest are in `public/`. Production output is generated into `dist/`.

## Build, Test, and Development Commands
Run `npm install` once to install dependencies.

- `npm run dev`: watch build for extension development; rebuilds into `dist/` on changes.
- `npm run build`: TypeScript compile plus production Vite build.
- `npm run preview`: preview the Vite build locally when needed.
- `npm run format`: apply Prettier to `src/**/*.{ts,tsx,js,jsx,json,css,md}`.
- `npm run format:check`: verify formatting in CI or before opening a PR.

Load the built extension from `dist/` in `chrome://extensions` with Developer Mode enabled.

## Coding Style & Naming Conventions
This project uses TypeScript, React, and Tailwind. Prettier is the enforced formatter: 2-space indentation, single quotes, semicolons, trailing commas (`es5`), and 100-character line width. Use `PascalCase` for React components (`TabList.tsx`), `camelCase` for functions and hooks (`useLiveTabs.ts`), and descriptive kebab-free filenames for API modules (`chrome-sync.ts` is the established exception). Keep background logic stateless and prefer shared types over ad hoc message payloads.

## Testing Guidelines
There is no automated test suite configured yet. Until one is added, validate changes with `npm run build`, then manually test the affected flows in the unpacked Chrome extension, especially tab actions, saved contexts, and search behavior. If you add tests later, place them beside the feature or under a dedicated `src/**/__tests__/` folder and mirror the source filename.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `Add Chrome Sync Storage and startup recovery modules` and `Improve multi-select UI with clean, professional design`. Follow that style: one clear action per commit. PRs should include a concise description, impacted areas, manual test notes, and screenshots or recordings for UI changes. Link related issues when applicable.

## Extension-Specific Notes
Treat `public/manifest.json` and MV3 background behavior as sensitive surfaces. Avoid introducing persistent in-memory state in the service worker; prefer Dexie or Chrome storage for anything that must survive worker restarts.
