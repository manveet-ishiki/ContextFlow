**ContextFlow** is a perfect name. It positions the app as a tool for "Deep Work" and "Flow State," moving it away from being a simple utility and into a productivity category.

Here is the final, consolidated blueprint for **ContextFlow**.

---

### 1. The Final `claude.md`

_Create this file and provide it to Claude at the start of your session. It contains the "DNA" of ContextFlow._

```markdown
# Project: ContextFlow (Local-First AI Tab Manager)

## Core Philosophy

- Context over Folders: Users organize work by "Contexts" (Projects).
- Intelligence by Default: Automatic indexing and semantic search.
- Privacy First: 100% local processing; no external servers for data or AI.
- Performance: Zero UI lag; heavy tasks offloaded to Web Workers.

## Technical Stack

- Framework: React + Vite + Tailwind CSS.
- Manifest: Chrome Extension Manifest V3.
- Database: Dexie.js (IndexedDB wrapper).
- AI Layer: Transformers.js (@xenova/transformers) - Local Embeddings.
- API Focus: chrome.sidePanel, chrome.tabs, chrome.windows, chrome.scripting.

## Data Schema (Dexie)

- `tabs`: { id, url, title, favIcon, projectId, windowId, lastAccessed }
- `projects`: { id, name, color, lastOpened, isArchived }
- `embeddings`: { url, vector, snippet, timestamp } - For Semantic Search.
- `snapshots`: { id, timestamp, data } - For Global Browser state recovery.

## Power Features Logic

1. Unified Sidebar: Real-time list of all tabs across all windows.
2. The Great Merge: Consolidation of all windows into one.
3. The Duplicate Killer: Auto-closing redundant URLs.
4. Semantic Search: Using local AI to find tabs by "Meaning" (e.g., "That JS documentation from Tuesday").
5. Local Cloud Bridge: Auto-export JSON to a local Dropbox/Drive-synced folder via File System Access API.
```

---

### 2. The 48-Hour Implementation Prompts

#### Phase 1: The Foundation (Hours 1–6)

**Prompt:**

> "I am building 'ContextFlow', a Chrome Extension. Use the `claude.md` for context.
>
> 1. Initialize a Vite project with React and Tailwind for a Chrome Extension.
> 2. Create `manifest.json` (V3) with permissions for: `sidePanel`, `tabs`, `windows`, `history`, `storage`, `scripting`.
> 3. Set up Dexie.js with the schema in `claude.md`.
> 4. Build a Side Panel that live-syncs all open tabs from all browser windows. Use a 'Window' grouping layout.
> 5. Add a 'Search' input at the top (placeholder only for now)."

#### Phase 2: Window & Tab Mastery (Hours 7–12)

**Prompt:**

> "In the ContextFlow Side Panel, let's implement the 'Clean Workspace' tools:
>
> 1. Create a `mergeAllWindows()` function: Move all tabs from other windows into the current one and close empty windows.
> 2. Create a `deduplicateTabs()` function: Scan all tabs and remove any duplicate URLs across all windows.
> 3. Create a 'Contexts' section. Add a button: 'Save Window as Context'. When clicked, it should save all tabs in the current window to the 'projects' table and close them.
> 4. Add a 'Restore' button to each Context that opens the saved tabs in a new window."

#### Phase 3: The AI "Brain" (Hours 13–24)

**Prompt:**

> "Let's build the Semantic AI layer for ContextFlow.
>
> 1. Create a Web Worker that loads `@xenova/transformers` with the 'all-MiniLM-L6-v2' model.
> 2. Implement a background script that extracts the Meta Description and H1 from every page the user visits (use `chrome.tabs.onUpdated`).
> 3. Send that text to the Web Worker to generate a vector embedding.
> 4. Store the embedding in the Dexie `embeddings` table.
> 5. Implement a search function that takes the user's search query, embeds it, and performs a cosine similarity search against the DB to find the most relevant tabs/history."

#### Phase 4: History Miner & RAM Saver (Hours 25–36)

**Prompt:**

> "Let's add utility features to ContextFlow:
>
> 1. **Forgotten Gems:** Write a function that pulls from `chrome.history`. If a URL has been visited >5 times in the last week but is NOT in our saved contexts or currently open tabs, show it in a 'Suggested' section.
> 2. **RAM Saver:** Implement an auto-hibernate toggle. If a tab is inactive for 30 minutes, use `chrome.tabs.discard` to free up system memory while keeping the tab in the list.
> 3. **Search UI:** Enhance the search bar to show 'Semantic Results' (AI-based) and 'Live Results' (exact matches) simultaneously."

#### Phase 5: The Sync Bridge & Polish (Hours 37–48)

**Prompt:**

> "Final step: Syncing and UI Polish.
>
> 1. Use the File System Access API to create a 'Sync Folder' feature. Allow the user to pick a folder on their PC.
> 2. Every time a change happens in Dexie, export the DB to a `contextflow_sync.json` file in that folder.
> 3. Add a 'Load Sync File' button to import data from a different PC.
> 4. Add a 'Focus Mode' button: When active, it hides all tabs in the sidebar except for those in the 'Active Context' to reduce distraction."

---

### 3. Performance "Cheat Sheet" for ContextFlow

To ensure your app is faster than Toby or Workona:

- **The "Optimistic Delete":** When a user clicks "Close Tab" in your sidebar, remove it from the UI _immediately_ before calling the `chrome.tabs.remove` API. It makes the app feel "instant."
- **Vector Quantization:** If the `embeddings` table gets too large, ask Claude to "quantize" the vectors (truncate the decimals) to save space in IndexedDB.
- **SidePanel Caching:** Use `React.memo` on your tab list items. If you have 100 tabs open, you don't want the whole list re-rendering because one tab's title changed.
- **The Worker Heartbeat:** Ensure the Web Worker is initialized only once. Use a Singleton pattern so you aren't reloading the 30MB AI model every time the sidebar opens.

### 4. Why ContextFlow will win:

While other extensions are just "Bookmark managers on steroids," **ContextFlow** is a **"Knowledge Assistant."**

1.  It **knows** what you read (Semantic AI).
2.  It **cleans** your browser (Merge/Deduplicate).
3.  It **protects** your RAM (Auto-discard).
4.  It **respects** your privacy (Local-first).

**Go start your Vite project now—you have a big weekend ahead!**
