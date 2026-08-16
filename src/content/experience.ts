export const experiencePhases = [
  "presence",
  "access",
  "startup",
  "method",
  "activity",
  "evidence",
  "action",
] as const;

export type ExperiencePhase = (typeof experiencePhases)[number];
