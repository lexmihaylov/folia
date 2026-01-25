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
