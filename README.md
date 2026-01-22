# Folia KB

Folia is a filesystem-first knowledge base for Markdown notes. It scans a
configured root folder, renders a live tree, and lets you create, edit, rename,
copy, and move documents directly on disk.

## Features

- Filesystem-backed Markdown library (no database required).
- Collapsible folder tree with per-user persistence.
- Full-text search across Markdown pages.
- Inline create/rename/delete for files and folders.
- Clipboard actions: copy, cut, paste.
- Markdown editor with live preview and theme toggle.
- Session-based login with hashed password stored on disk.
- Per-user preferences stored in `.folia-<username>.json` at the library root.

## Requirements

- Node.js 20+
- npm

## Install

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Set the library root in `folia.config.json`:

```json
{
  "libraryRoot": "/absolute/path/to/your/notes"
}
```

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Authentication

On first run, Folia redirects to `/setup` to create a username and password.
Credentials are hashed and stored in `credentials.json` in the project root.

After setup, use `/login` to sign in. Sessions are stored in an HTTP-only cookie
and expire after 7 days.

## User Preferences

Per-user data is stored in `.folia-<username>.json` at the library root, including:

- `collapsed`: collapsed tree nodes
- `theme`: `light` or `dark`

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - build for production
- `npm run start` - start the production server
- `npm run lint` - run lint checks

## Notes

- Only `.md` files are rendered.
- The library tree is read from disk; no content is bundled at build time.
