import type { Metadata, Site, Socials } from "@types";

export const SITE: Site = {
  TITLE: "Kwan dev",
  DESCRIPTION: "Kwan dev is a blog about web development and programming.",
  EMAIL: "rudghks7816@gmail.com",
  NUM_POSTS_ON_HOMEPAGE: 5,
  NUM_NOTES_ON_HOMEPAGE: 3,
};

export const HOME: Metadata = {
  TITLE: "Home",
  DESCRIPTION: "Astro Micro is an accessible theme for Astro.",
};

export const BLOG: Metadata = {
  TITLE: "Blog",
  DESCRIPTION: "A collection of articles on topics I am passionate about.",
};

export const NOTES: Metadata = {
  TITLE: "Notes",
  DESCRIPTION: "A collection of notes on topics I am passionate about.",
};

export const SOCIALS: Socials = [
  {
    NAME: "GitHub",
    HREF: "https://github.com/kwandev",
  },
  // {
  //   NAME: "Website",
  //   HREF: "https://trevortylerlee.com",
  // },
];
