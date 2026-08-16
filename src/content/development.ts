import {
  activityRecordSchema,
  globalFactRecordSchema,
  networkOrganizationSchema,
  personRecordSchema,
  programRecordSchema,
  proofRecordSchema,
} from "./schema";

/**
 * Deliberately non-factual records for layout and integration development.
 * Every record is classification D, unapproved, and machine-detectable.
 */
export const developmentProofRecords = Object.freeze([
  proofRecordSchema.parse({
    contentType: "proof",
    id: "development-proof-single",
    slug: "development-proof-single",
    title: "Development Single-Test Fixture",
    summary: "Non-factual single-test structure for automated testing only.",
    recordStructure: "single-test",
    fieldCondition: "Non-factual field-condition slot.",
    technology: "Non-factual technology slot.",
    environment: "Non-factual environment slot.",
    test: "Non-factual single-test slot.",
    evidence: "Non-factual evidence slot.",
    nextStep: "Non-factual next-step slot.",
    evidenceItems: [
      {
        id: "development-single-evidence",
        label: "Development evidence item",
        summary: "Non-factual evidence-item slot.",
        classification: "D",
        publicApproved: false,
        sourceReferenceInternal:
          "Development-only structural fixture; no factual source.",
      },
    ],
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal:
      "Development-only structural fixture; no factual source.",
  }),
  proofRecordSchema.parse({
    contentType: "proof",
    id: "development-proof-multi-phase",
    slug: "development-proof-multi-phase",
    title: "Development Multi-Phase Fixture",
    summary: "Non-factual multi-phase structure for automated testing only.",
    recordStructure: "multi-phase",
    phases: [
      {
        id: "development-phase-one",
        label: "Development phase one",
        summary: "Non-factual first-phase slot.",
        status: "completed",
        classification: "D",
        publicApproved: false,
        sourceReferenceInternal:
          "Development-only structural fixture; no factual source.",
      },
      {
        id: "development-phase-two",
        label: "Development phase two",
        summary: "Non-factual second-phase slot.",
        status: "ongoing",
        classification: "D",
        publicApproved: false,
        sourceReferenceInternal:
          "Development-only structural fixture; no factual source.",
      },
      {
        id: "development-phase-three",
        label: "Development phase three",
        summary: "Non-factual third-phase slot.",
        status: "planned",
        classification: "D",
        publicApproved: false,
        sourceReferenceInternal:
          "Development-only structural fixture; no factual source.",
      },
    ],
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal:
      "Development-only structural fixture; no factual source.",
  }),
  proofRecordSchema.parse({
    contentType: "proof",
    id: "development-proof-no-outcome",
    slug: "development-proof-no-outcome",
    title: "Development No-Outcome Fixture",
    summary: "Non-factual no-outcome structure for automated testing only.",
    recordStructure: "single-test",
    fieldCondition: "Non-factual field-condition slot.",
    test: "Non-factual test slot.",
    evidence: "Non-factual evidence slot without an outcome.",
    evidenceItems: [
      {
        id: "development-no-outcome-evidence",
        label: "Development evidence item",
        value: "Non-factual evidence-value slot.",
        classification: "D",
        publicApproved: false,
        sourceReferenceInternal:
          "Development-only structural fixture; no factual source.",
      },
    ],
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal:
      "Development-only structural fixture; no factual source.",
  }),
  proofRecordSchema.parse({
    contentType: "proof",
    id: "development-proof-partial",
    slug: "development-proof-partial",
    title: "Development Partial Fixture",
    summary: "Non-factual partial structure for automated testing only.",
    fieldCondition: "Non-factual partial field-condition slot.",
    test: "Non-factual partial test slot.",
    evidence: "Non-factual partial evidence slot.",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal:
      "Development-only structural fixture; no factual source.",
  }),
]);

export const developmentActivityRecords = Object.freeze([
  activityRecordSchema.parse({
    contentType: "activity",
    id: "development-activity-record",
    slug: "development-activity-record",
    type: "field-note",
    title: "Development Activity Record",
    summary: "Approved dated activity pending.",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
  }),
]);

export const developmentProgramRecords = Object.freeze([
  programRecordSchema.parse({
    contentType: "program",
    id: "development-program-record",
    slug: "development-program-record",
    name: "Development Program Record",
    summary: "Approved program content pending.",
    family: "other",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
  }),
]);

export const developmentNetworkOrganizationRecords = Object.freeze([
  networkOrganizationSchema.parse({
    contentType: "network-organization",
    id: "development-network-organization",
    slug: "development-network-organization",
    name: "Development Organization Record",
    summary: "Approved organization content pending.",
    kind: "other",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
  }),
]);

export const developmentPeopleRecords = Object.freeze([
  personRecordSchema.parse({
    contentType: "person",
    id: "development-person-record",
    slug: "development-person-record",
    name: "Development Person Record",
    bio: "Approved person content pending.",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
  }),
]);

export const developmentGlobalFactRecords = Object.freeze([
  globalFactRecordSchema.parse({
    contentType: "global-fact",
    id: "development-global-fact",
    key: "development-global-fact",
    label: "Development Global Fact",
    value: "Approved content pending.",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
  }),
]);

export const developmentContent = Object.freeze({
  proof: developmentProofRecords,
  activity: developmentActivityRecords,
  programs: developmentProgramRecords,
  networkOrganizations: developmentNetworkOrganizationRecords,
  people: developmentPeopleRecords,
  globalFacts: developmentGlobalFactRecords,
});
