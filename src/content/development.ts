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
    id: "development-proof-record",
    slug: "development-proof-record",
    title: "Development Proof Record",
    summary: "Approved content pending.",
    fieldCondition: "Approved field condition pending.",
    technology: "Approved technology description pending.",
    environment: "Field evidence pending approved media.",
    test: "Approved test description pending.",
    evidence: "Approved evidence pending.",
    decision: "Approved decision or next step pending.",
    classification: "D",
    publicApproved: false,
    developmentPlaceholder: true,
    sourceReferenceInternal: "Development-only placeholder; no factual source.",
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
