import { filterPublicRecords } from "./publication";
import { maradinProofRecord } from "./proof";

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
    title: ["Turn industrial needs", "into field evidence."],
    supporting: "Industrial need → technology search → field test → evidence.",
    supportingStatus: "approved-business-truth",
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
    supporting: "A real-world field test enters through the aperture.",
    supportingStatus: "approved-public-record",
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-need",
    phase: "need",
    act: "03",
    label: "Need",
    title: ["A need", "applies pressure."],
    supporting: maradinProofRecord.fieldCondition,
    supportingStatus: "approved-public-record",
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-find",
    phase: "find",
    act: "04",
    label: "Find",
    title: ["Search wide.", "Select precisely."],
    supporting: "Maradin / MEMS-based laser scanning / Dynamic ground projection.",
    supportingStatus: "approved-public-record",
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-test",
    phase: "test",
    act: "05",
    label: "Test",
    title: ["Out of abstraction.", "Into contact."],
    supporting: "Vehicle-mounted testing across more than 60 real-world scenarios.",
    supportingStatus: "approved-public-record",
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
  {
    id: "homepage-act-prove",
    phase: "prove",
    act: "06",
    label: "Prove",
    title: ["Uncertainty", "collapses into evidence."],
    supporting: "The POC produced comparative field evidence across real-world conditions.",
    supportingStatus: "approved-public-record",
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
  },
] as const;

export const homepageActs = filterPublicRecords(approvedActContent);

export const homepageProofFields = [
  {
    key: "field-condition",
    label: "Field condition",
    value: maradinProofRecord.fieldCondition,
  },
  {
    key: "technology",
    label: "Technology",
    value: maradinProofRecord.technology,
  },
  {
    key: "environment",
    label: "Environment",
    value: maradinProofRecord.environment,
  },
  { key: "test", label: "Test", value: maradinProofRecord.test },
  { key: "evidence", label: "Evidence", value: maradinProofRecord.evidence },
  { key: "next-step", label: "Next step", value: maradinProofRecord.nextStep },
] as const;

export const findSequence = [
  { index: "01", label: "Landscape", description: "Cross-domain possibility" },
  { index: "02", label: "Relevance", description: "Vehicle-to-road communication" },
  { index: "03", label: "Maradin", description: "Dynamic ground projection" },
] as const;

export const findSelection = Object.freeze({
  startup: maradinProofRecord.startup,
  method: "MEMS-based laser scanning",
  title: maradinProofRecord.title,
});
