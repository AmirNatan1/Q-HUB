import { z } from "zod";

import {
  experiencePhases,
  type ExperiencePhase,
} from "./experience";
import { filterPublicRecords } from "./publication";
import {
  publicPartnerOrganizations,
  sparkProgram,
} from "./strategic";

export { experiencePhases };
export type { ExperiencePhase };

const actionSchema = z.object({
  label: z.string().trim().min(1),
  href: z.string().trim().min(1).refine(
    (href) => href.startsWith("/") || href.startsWith("mailto:"),
    "Homepage actions must use a local path or approved email destination.",
  ),
}).strict();

export const homepageActSchema = z.object({
  id: z.string().trim().min(1),
  phase: z.enum(experiencePhases),
  act: z.string().regex(/^0[1-7]$/u),
  label: z.string().trim().min(1),
  title: z.array(z.string().trim().min(1)).min(1).max(2),
  supporting: z.string().trim().min(1).optional(),
  action: actionSchema.optional(),
  classification: z.enum(["A", "B", "C", "D"]),
  publicApproved: z.boolean(),
  developmentPlaceholder: z.boolean(),
}).strict();

export const workWithQuantumHref = "mailto:info@quantum-hub.com";
export const proofIndexHref = "/proof/";

const approvedActCandidates = homepageActSchema.array().parse([
  {
    id: "homepage-act-presence",
    phase: "presence",
    act: "01",
    label: "Presence",
    title: ["Quantum Hub"],
    supporting: "Where industry meets technology.",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-access",
    phase: "access",
    act: "02",
    label: "Access",
    title: ["Access to the field."],
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-startup",
    phase: "startup",
    act: "03",
    label: "Startup desire",
    title: ["Your technology.", "Real industrial context."],
    supporting: sparkProgram.summary,
    action: {
      label: "Start a conversation",
      href: workWithQuantumHref,
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-method",
    phase: "method",
    act: "04",
    label: "Method",
    title: ["Find. Test. Prove."],
    supporting: "From industrial need to field evidence.",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-activity",
    phase: "activity",
    act: "05",
    label: "Activity",
    title: ["Quantum in motion."],
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-evidence",
    phase: "evidence",
    act: "06",
    label: "Evidence",
    title: ["Real field.", "Documented evidence."],
    action: {
      label: "Explore Proof",
      href: proofIndexHref,
    },
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-action",
    phase: "action",
    act: "07",
    label: "Action",
    title: ["Take your technology", "into the field."],
    action: {
      label: "Work with Quantum",
      href: workWithQuantumHref,
    },
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
]);

export const homepageActs = Object.freeze(
  filterPublicRecords(approvedActCandidates),
);

if (homepageActs.length !== experiencePhases.length) {
  throw new Error("Every approved Phase R homepage act must pass publication filtering.");
}

export const methodStates = ["find", "test", "prove"] as const;

export const activitySignals = [
  "Field testing",
  "Programs",
  "Partner engagement",
  "Global ecosystem",
] as const;

export const homepageCopyCeilings = Object.freeze({
  primaryWords: 10,
  supportingWords: 20,
  paragraphWords: 24,
  settledNarrativeWords: 35,
  mobileVisibleWords: 28,
});

export interface HomepageCopyAuditInput {
  phase: ExperiencePhase;
  primary: string;
  supporting?: string;
  action?: string;
  essentialLabels?: readonly string[];
  mobileVisible?: readonly string[];
}

export function countPublicWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function auditHomepageCopyDensity(input: HomepageCopyAuditInput) {
  const supporting = input.supporting ? [input.supporting] : [];
  const action = input.action ? [input.action] : [];
  const labels = [...(input.essentialLabels ?? [])];
  const settledStrings = [input.primary, ...supporting, ...action, ...labels];
  const mobileStrings = input.mobileVisible
    ? [...input.mobileVisible]
    : settledStrings;
  const result = {
    phase: input.phase,
    primaryWords: countPublicWords(input.primary),
    supportingWords: countPublicWords(input.supporting ?? ""),
    longestParagraphWords: Math.max(0, ...supporting.map(countPublicWords)),
    settledNarrativeWords: settledStrings.reduce(
      (total, value) => total + countPublicWords(value),
      0,
    ),
    mobileVisibleWords: mobileStrings.reduce(
      (total, value) => total + countPublicWords(value),
      0,
    ),
  };
  return {
    ...result,
    pass:
      result.primaryWords <= homepageCopyCeilings.primaryWords
      && result.supportingWords <= homepageCopyCeilings.supportingWords
      && result.longestParagraphWords <= homepageCopyCeilings.paragraphWords
      && result.settledNarrativeWords <= homepageCopyCeilings.settledNarrativeWords
      && result.mobileVisibleWords <= homepageCopyCeilings.mobileVisibleWords,
  };
}

const extraLabelsByPhase: Partial<
  Record<ExperiencePhase, readonly string[]>
> = {
  access: [
    "Founding Partners",
    "Strategic Partners",
    ...publicPartnerOrganizations.map((partner) => partner.name),
  ],
  activity: activitySignals,
};

export const homepageCopyDensityReport = Object.freeze(
  homepageActs.map((act) => auditHomepageCopyDensity({
    phase: act.phase,
    primary: act.title.join(" "),
    ...(act.supporting ? { supporting: act.supporting } : {}),
    ...(act.action ? { action: act.action.label } : {}),
    ...(extraLabelsByPhase[act.phase]
      ? { essentialLabels: extraLabelsByPhase[act.phase] }
      : {}),
  })),
);
