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
