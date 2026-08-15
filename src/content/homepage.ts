import { filterPublicRecords } from "./publication";

export const experiencePhases = [
  "signal",
  "aperture",
  "need",
  "find",
  "test",
  "prove",
] as const;

export type ExperiencePhase = (typeof experiencePhases)[number];

const approvedActContent = [
  {
    id: "homepage-act-signal",
    phase: "signal",
    act: "01",
    label: "Signal",
    title: ["Beyond the signal.", "Into the field."],
    supporting: "Possibility is only the beginning.",
    supportingStatus: "editorial-draft",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-aperture",
    phase: "aperture",
    act: "02",
    label: "Aperture",
    title: ["The signal", "becomes the field."],
    supporting: "Explore the composition to expose the physical layer beneath.",
    supportingStatus: "editorial-draft",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-need",
    phase: "need",
    act: "03",
    label: "Need",
    title: ["A need", "applies pressure."],
    supporting: "Constraint turns a wide landscape into something worth solving.",
    supportingStatus: "editorial-draft",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-find",
    phase: "find",
    act: "04",
    label: "Find",
    title: ["Search wide.", "Select precisely."],
    supporting: "Relationships surface. Relevance begins to converge.",
    supportingStatus: "editorial-draft",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-test",
    phase: "test",
    act: "05",
    label: "Test",
    title: ["Out of abstraction.", "Into contact."],
    supporting: "This left the presentation and entered the field.",
    supportingStatus: "approved-language",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-prove",
    phase: "prove",
    act: "06",
    label: "Prove",
    title: ["Uncertainty", "collapses into evidence."],
    supporting: "A decision becomes possible.",
    supportingStatus: "approved-language",
    classification: "A",
    publicApproved: true,
    developmentPlaceholder: false,
  },
] as const;

export const homepageActs = filterPublicRecords(approvedActContent);

export const developmentProofFields = [
  { key: "field-condition", label: "Field condition", value: "Approved content pending" },
  { key: "technology", label: "Technology", value: "Approved content pending" },
  { key: "environment", label: "Environment", value: "Approved media and context pending" },
  { key: "test", label: "Test", value: "Approved test description pending" },
  { key: "evidence", label: "Evidence", value: "Approved evidence pending" },
  { key: "decision", label: "Decision / next step", value: "Approved decision pending" },
] as const;

export const findSequence = [
  { index: "01", label: "Landscape", description: "Cross-domain possibility" },
  { index: "02", label: "Adjacency", description: "Relevant relationships" },
  { index: "03", label: "Selection", description: "One signal emerges" },
] as const;
