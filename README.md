# ContextFlow - Local-First AI Tab Manager

A Chrome Extension for managing tabs with AI-powered semantic search and context-based organization.

## Features

- **Live Tab Management**: Real-time view of all open tabs across all windows
- **Multi-Select Close**: Select multiple tabs with checkboxes and close them at once
- **Merge Windows**: Consolidate all browser windows into one (closes other windows)
- **Kill Duplicates**: Remove duplicate tabs automatically
- **Hibernate**: Free memory by discarding inactive tabs
- **Save Contexts**: Save current tabs, create new tab, close all others (browser persists!)
- **Restore Contexts**: Open saved tabs in a new window
- **Smart Search**:
  - Live filter for active tabs
  - Date-based search (e.g., "last week", "yesterday", "3 days ago")
  - AI semantic search (⌘↵)
- **100% Local**: No external servers, all AI processing happens locally

## Installation

1. Build the extension:
   ```bash
   npm install
   npm run build
   ```

2. Load in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `/dist` folder

## Usage

### Basic Navigation

- Click the ContextFlow icon to open the side panel
- Switch between "Tabs" and "Saved" views using the toggle buttons

### Window Management (Inline Actions)

Each window header has 4 small icons:
- **Combine icon**: Merge all windows into one
- **Copy icon**: Remove duplicate tabs
- **Moon icon**: Hibernate inactive tabs
- **Save icon**: Save current window as a context

### Multi-Select & Close Tabs

1. Click **"Select Tabs"** button at the top
2. Click checkboxes on tabs you want to close (or "Select All")
3. Click **"Close Selected"** button
4. Click **"Exit Select"** to return to normal mode

### Saving Contexts

1. Click the **Save icon** (💾) beside a window header
2. Enter a name for your context
3. Press Enter or click "Save"
4. **All tabs are saved to database**
5. **A new tab opens and all other tabs close** (browser stays open!)

### Restoring Contexts

1. Go to the "Saved" tab
2. Click the folder icon on any saved context
3. All tabs will open in a new window

### Search

**Active Tab Search:**
- Type in the search bar to filter currently open tabs by title/URL

**Date-Based Search (AI Layer):**
- Type `"last week"` - finds tabs you visited in the past 7 days
- Type `"yesterday"` - finds tabs from yesterday
- Type `"3 days ago"` - finds tabs from the last 3 days
- Type `"last month"` - finds tabs from the past 30 days
- Icon changes to 🗓️ calendar when using date search

**AI Semantic Search:**
- Press **⌘↵** (Cmd+Enter) for AI-powered meaning-based search
- Click the ✨ sparkle icon for AI search

## Development

```bash
# Development mode (watch)
npm run dev

# Production build
npm run build
```

## Architecture

- **Side Panel**: React UI with real-time tab synchronization
- **Background Worker**: Stateless MV3 service worker
- **Offscreen Document**: Runs Transformers.js AI model (WASM)
- **Content Script**: Extracts page metadata for semantic indexing
- **Database**: Dexie.js (IndexedDB) for local storage

## Recent Changes

### v1.0.2 - Multi-Select, Date Search & Improved Context Saving

**New Features:**
- ✅ **Multi-select tabs with checkboxes** - Select and close multiple tabs at once
- 🗓️ **Date-based search** - Find tabs from "last week", "yesterday", "3 days ago", etc.
- 🧠 **AI Layer for historical search** - Search through saved tabs by date
- 📅 **Visit tracking** - System now tracks when you visited each URL

**Improved Behaviors:**
- **Save Context**: Now creates a new tab and closes all others (browser persists!)
- **Merge Windows**: Explicitly closes other windows after merging (more predictable)
- **Search Bar**: Shows calendar icon (🗓️) when using date-based queries

**UI Improvements:**
- "Select Tabs" button enables checkbox mode
- "Close Selected" button appears when tabs are selected
- "Select All" and "Clear" quick actions
- Better visual feedback for selected tabs

### v1.0.1 - Minimal UI & Fixed Context Saving

**UI Improvements:**
- More minimal, distraction-free design
- Removed large action button grid
- Moved all power actions inline with window headers

**Bug Fixes:**
- Fixed context saving and restoration
- Improved tab database management

## Privacy

All data is stored locally in IndexedDB. The AI model (Xenova/all-MiniLM-L6-v2) runs entirely in your browser. No data is sent to external servers.

## License

MIT
