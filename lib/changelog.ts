export type ChangelogSection = {
  title: string;
  items: string[];
};

export type ChangelogEntry = {
  version: string;
  date: string;
  summary: string;
  badge?: string;
  sections: ChangelogSection[];
};

export const changelog: ChangelogEntry[] = [
  {
    version: "0.2.8",
    date: "2026-04-14",
    summary: "Patch release with a vault state sync fix.",
    sections: [
      {
        title: "Fixed",
        items: ["Fixed stale app state after locking and unlocking the vault."],
      },
    ],
  },
  {
    version: "0.2.7",
    date: "2026-04-14",
    summary: "Patch release with a date-related hydration fix.",
    sections: [
      {
        title: "Fixed",
        items: ["Fixed a hydration error triggered by date rendering."],
      },
    ],
  },
  {
    version: "0.2.6",
    date: "2026-04-14",
    summary: "Patch release with a save button state fix.",
    sections: [
      {
        title: "Fixed",
        items: ["Fixed the Save button state so it updates correctly while editing notes."],
      },
    ],
  },
  {
    version: "0.2.5",
    date: "2026-04-14",
    summary: "Patch release with a vault save state fix.",
    sections: [
      {
        title: "Fixed",
        items: ["Fixed the Save button staying disabled after unlocking the vault."],
      },
    ],
  },
  {
    version: "0.2.4",
    date: "2026-04-14",
    summary: "Patch release with changelog tooling fixes.",
    sections: [
      {
        title: "Fixed",
        items: ["Fixed changelog generation so release notes receive commit logs correctly."],
      },
    ],
  },
  {
    version: "0.2.3",
    date: "2026-04-14",
    summary: "Patch release with no user-facing changes.",
    sections: [
      {
        title: "Changed",
        items: ["No user-facing changes since v0.2.2."],
      },
    ],
  },
  {
    version: "0.2.2",
    date: "2026-04-14",
    summary: "Patch release with no user-facing changes.",
    sections: [
      {
        title: "Changed",
        items: ["No user-facing changes since v0.2.1."],
      },
    ],
  },
  {
    version: "0.2.1",
    date: "2026-04-14",
    summary: "Patch release with no user-facing changes.",
    sections: [
      {
        title: "Changed",
        items: ["No user-facing changes since v0.2.0."],
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-14",
    summary: "Encrypted notes and vault-based secret storage.",
    sections: [
      {
        title: "Added",
        items: [
          "Encrypted `.emd` notes for storing secrets and keys.",
          "A vault passphrase flow for creating, unlocking, and locking encrypted notes.",
          "An in-app vault dialog instead of browser prompts for vault actions.",
        ],
      },
      {
        title: "Changed",
        items: [
          "Library routing and file actions now support both plain `.md` and encrypted `.emd` notes.",
          "Encrypted notes are excluded from plaintext search results.",
          "Release scripts now use an explicit versioning workflow without fragile `%s` placeholders.",
        ],
      },
    ],
  },
  {
    version: "0.1.7",
    date: "2026-01-26",
    summary: "Patch release with no user-facing changes.",
    sections: [
      {
        title: "Changed",
        items: ["No user-facing changes since v0.1.6."],
      },
    ],
  },
  {
    version: "0.1.6",
    date: "2026-01-25",
    summary: "Patch release with no user-facing changes.",
    sections: [
      {
        title: "Changed",
        items: ["No user-facing changes since v0.1.5."],
      },
    ],
  },
  {
    version: "0.1.5",
    date: "2026-01-23",
    summary: "Library experience polish.",
    sections: [
      {
        title: "Improved",
        items: [
          "Refactoring for better maintainability.",
          "Show the editor-only pane when entering edit mode.",
          "Tuned mobile editor/preview font sizes for readability.",
        ],
      },
    ],
  },
  {
    version: "0.1.4",
    date: "2026-01-23",
    summary: "Patch release with responsive layout refinements.",
    sections: [
      {
        title: "Improved",
        items: [
          "Added a mobile header actions menu for About and theme toggle.",
          "Adjusted spacing and panel padding for smaller screens.",
          "Only show add actions in the sidebar when it is visible.",
        ],
      },
    ],
  },
  {
    version: "0.1.3",
    date: "2026-01-23",
    summary: "Patch release with update script fixes.",
    sections: [
      {
        title: "Improved",
        items: ["Ensure update script preserves credentials and config files."],
      },
    ],
  },
  {
    version: "0.1.2",
    date: "2026-01-23",
    summary: "Patch release with packaging updates.",
    sections: [
      {
        title: "Improved",
        items: ["Updated release packaging workflow and scripts."],
      },
    ],
  },
  {
    version: "0.1.0",
    date: "2025-01-22",
    summary: "Initial release with filesystem-backed notes and auth.",
    badge: "Initial",
    sections: [
      {
        title: "Added",
        items: [
          "Filesystem library scanning with Markdown rendering.",
          "Tree actions for create, rename, delete, copy, and move.",
          "Session-based login with hashed credentials on disk.",
          "Per-user preferences stored at the library root.",
        ],
      },
      {
        title: "Improved",
        items: [
          "Theme persistence across devices.",
          "Search and filtering in the library tree.",
        ],
      },
    ],
  },
];
