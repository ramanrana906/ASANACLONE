import type { ProjectStatus } from "@asanaClone/shared";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
};

export const STATUS_DOT_CLASS: Record<ProjectStatus, string> = {
  on_track: "project-status-dot--on-track",
  at_risk: "project-status-dot--at-risk",
  off_track: "project-status-dot--off-track",
};

export const STATUS_OPTIONS: ProjectStatus[] = ["on_track", "at_risk", "off_track"];
