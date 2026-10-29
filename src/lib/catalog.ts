import type { PublishState } from "./types";
import type { Tone } from "@/components/ui";

export const STATE_LABEL: Record<PublishState, string> = {
  published: "Published",
  new: "New",
  changed: "Changed",
  removing: "Removing",
  retired: "Retired",
};

export const STATE_TONE: Record<PublishState, Tone> = {
  published: "green",
  new: "blue",
  changed: "amber",
  removing: "red",
  retired: "gray",
};

export const STATE_HELP: Record<PublishState, string> = {
  published: "Live in the apps, unchanged since the last publish.",
  new: "Not in the apps yet. It goes live with the next publish.",
  changed: "Edited since the last publish. The apps still show the old version.",
  removing: "Retired. It leaves the apps with the next publish.",
  retired: "Not offered in the apps. Old designs still show it.",
};
