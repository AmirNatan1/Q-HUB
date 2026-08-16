import { z } from "zod";

const nonEmptyTextSchema = z.string().trim().min(1);
const identifierSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/);
const slugSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use an ISO calendar date (YYYY-MM-DD).")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");

/**
 * A = explicitly publishable
 * B = public candidate requiring explicit approval
 * C = internal/confidential
 * D = unverified/ambiguous
 */
export const publicationClassificationSchema = z.enum(["A", "B", "C", "D"]);

export type PublicationClassification = z.infer<
  typeof publicationClassificationSchema
>;

const publicationFieldsShape = {
  classification: publicationClassificationSchema,
  publicApproved: z.boolean(),
  developmentPlaceholder: z.boolean(),
  sourceReferenceInternal: nonEmptyTextSchema.optional(),
} as const;

export const publicationFieldsSchema = z
  .object(publicationFieldsShape)
  .strict()
  .superRefine((record, context) => {
    if (record.developmentPlaceholder && record.publicApproved) {
      context.addIssue({
        code: "custom",
        message: "Development placeholders cannot be public-approved.",
        path: ["publicApproved"],
      });
    }

    if (record.developmentPlaceholder && record.classification !== "D") {
      context.addIssue({
        code: "custom",
        message: "Development placeholders must use classification D.",
        path: ["classification"],
      });
    }
  });

export type PublicationFields = z.infer<typeof publicationFieldsSchema>;

function enforcePlaceholderSafety(
  record: PublicationFields,
  context: z.RefinementCtx,
): void {
  if (record.developmentPlaceholder && record.publicApproved) {
    context.addIssue({
      code: "custom",
      message: "Development placeholders cannot be public-approved.",
      path: ["publicApproved"],
    });
  }

  if (record.developmentPlaceholder && record.classification !== "D") {
    context.addIssue({
      code: "custom",
      message: "Development placeholders must use classification D.",
      path: ["classification"],
    });
  }
}

export const namedReferenceSchema = z
  .object({
    id: identifierSchema,
    name: nonEmptyTextSchema,
  })
  .strict();

export type NamedReference = z.infer<typeof namedReferenceSchema>;

export const relationshipLabelSchema = z.enum([
  "founding-partner",
  "strategic-partner",
  "industry-partner",
  "lp",
  "investor",
  "program-partner",
  "poc-partner",
  "ecosystem-collaborator",
]);

export type RelationshipLabel = z.infer<typeof relationshipLabelSchema>;

export const mediaAssetSchema = z
  .object({
    id: identifierSchema,
    kind: z.enum(["image", "video", "audio", "model", "document"]),
    src: nonEmptyTextSchema,
    alt: z.string().trim(),
    caption: nonEmptyTextSchema.optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    developmentPlaceholder: z.boolean(),
    sourceReferenceInternal: nonEmptyTextSchema.optional(),
  })
  .strict()
  .superRefine((asset, context) => {
    if (asset.developmentPlaceholder && !asset.id.startsWith("development-")) {
      context.addIssue({
        code: "custom",
        message: "Development media IDs must begin with `development-`.",
        path: ["id"],
      });
    }
  });

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

const nestedPublicationFieldsShape = {
  classification: publicationClassificationSchema,
  publicApproved: z.boolean(),
  sourceReferenceInternal: nonEmptyTextSchema.optional(),
} as const;

export const proofPhaseSchema = z
  .object({
    ...nestedPublicationFieldsShape,
    id: identifierSchema,
    label: nonEmptyTextSchema,
    summary: nonEmptyTextSchema,
    status: z.enum(["completed", "ongoing", "planned"]).optional(),
    date: isoDateSchema.optional(),
    media: z.array(mediaAssetSchema).min(1).optional(),
  })
  .strict();

export type ProofPhase = z.infer<typeof proofPhaseSchema>;

export const proofEvidenceItemSchema = z
  .object({
    ...nestedPublicationFieldsShape,
    id: identifierSchema,
    label: nonEmptyTextSchema,
    summary: nonEmptyTextSchema.optional(),
    value: nonEmptyTextSchema.optional(),
    media: mediaAssetSchema.optional(),
  })
  .strict()
  .superRefine((item, context) => {
    if (item.summary === undefined && item.value === undefined) {
      context.addIssue({
        code: "custom",
        message: "Proof evidence items require a summary or value.",
        path: ["summary"],
      });
    }
  });

export type ProofEvidenceItem = z.infer<typeof proofEvidenceItemSchema>;

export const proofRecordSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("proof"),
    id: identifierSchema,
    slug: slugSchema,
    title: nonEmptyTextSchema,
    summary: nonEmptyTextSchema,
    recordCode: nonEmptyTextSchema.optional(),
    recordStructure: z.enum(["single-test", "multi-phase"]).optional(),
    startup: namedReferenceSchema.optional(),
    operatingOrganization: namedReferenceSchema.optional(),
    relationshipLabels: z.array(relationshipLabelSchema).default([]),
    program: namedReferenceSchema.optional(),
    domains: z.array(nonEmptyTextSchema).default([]),
    fieldCondition: nonEmptyTextSchema.optional(),
    technology: nonEmptyTextSchema.optional(),
    environment: nonEmptyTextSchema.optional(),
    environmentTags: z.array(nonEmptyTextSchema).min(1).optional(),
    test: nonEmptyTextSchema.optional(),
    evidence: nonEmptyTextSchema.optional(),
    evidenceItems: z.array(proofEvidenceItemSchema).min(1).optional(),
    decision: nonEmptyTextSchema.optional(),
    nextStep: nonEmptyTextSchema.optional(),
    date: isoDateSchema.optional(),
    location: nonEmptyTextSchema.optional(),
    media: z.array(mediaAssetSchema).default([]),
    heroMedia: mediaAssetSchema.optional(),
    phases: z.array(proofPhaseSchema).min(1).optional(),
    featured: z.boolean().default(false),
    relatedProof: z.array(identifierSchema).default([]),
  })
  .strict()
  .superRefine((record, context) => {
    enforcePlaceholderSafety(record, context);

    if (record.recordStructure === "multi-phase" && !record.phases) {
      context.addIssue({
        code: "custom",
        message: "Multi-phase Proof records require at least one phase.",
        path: ["phases"],
      });
    }
  });

export type ProofRecord = z.infer<typeof proofRecordSchema>;

export const activityTypeSchema = z.enum([
  "field-test",
  "selected-company",
  "program-milestone",
  "delegation",
  "graduation",
  "collaboration",
  "event",
  "challenge",
  "field-note",
]);

export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityRecordSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("activity"),
    id: identifierSchema,
    slug: slugSchema,
    type: activityTypeSchema,
    title: nonEmptyTextSchema,
    summary: nonEmptyTextSchema,
    date: isoDateSchema.optional(),
    location: nonEmptyTextSchema.optional(),
    relatedProof: z.array(identifierSchema).default([]),
    media: z.array(mediaAssetSchema).default([]),
  })
  .strict()
  .superRefine((record, context) => {
    enforcePlaceholderSafety(record, context);

    const couldBePublic =
      (record.classification === "A" || record.classification === "B") &&
      record.publicApproved;

    if (couldBePublic && !record.date) {
      context.addIssue({
        code: "custom",
        message: "Publication-approved activity requires a real date.",
        path: ["date"],
      });
    }
  });

export type ActivityRecord = z.infer<typeof activityRecordSchema>;

export const programRecordSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("program"),
    id: identifierSchema,
    slug: slugSchema,
    name: nonEmptyTextSchema,
    summary: nonEmptyTextSchema,
    family: z.enum(["SPARK", "CHAMP", "other"]),
    audiences: z.array(nonEmptyTextSchema).default([]),
    media: z.array(mediaAssetSchema).default([]),
  })
  .strict()
  .superRefine(enforcePlaceholderSafety);

export type ProgramRecord = z.infer<typeof programRecordSchema>;

export const organizationKindSchema = z.enum([
  "industrial",
  "technology",
  "investment",
  "academic",
  "public-sector",
  "ecosystem",
  "other",
]);

export type OrganizationKind = z.infer<typeof organizationKindSchema>;

export const networkOrganizationSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("network-organization"),
    id: identifierSchema,
    slug: slugSchema,
    name: nonEmptyTextSchema,
    summary: nonEmptyTextSchema.optional(),
    kind: organizationKindSchema,
    relationshipLabels: z.array(relationshipLabelSchema).default([]),
    logo: mediaAssetSchema.optional(),
  })
  .strict()
  .superRefine(enforcePlaceholderSafety);

export type NetworkOrganization = z.infer<typeof networkOrganizationSchema>;

export const personRecordSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("person"),
    id: identifierSchema,
    slug: slugSchema,
    name: nonEmptyTextSchema,
    role: nonEmptyTextSchema.optional(),
    bio: nonEmptyTextSchema.optional(),
    affiliations: z.array(namedReferenceSchema).default([]),
    portrait: mediaAssetSchema.optional(),
  })
  .strict()
  .superRefine(enforcePlaceholderSafety);

export type PersonRecord = z.infer<typeof personRecordSchema>;

export const globalFactRecordSchema = z
  .object({
    ...publicationFieldsShape,
    contentType: z.literal("global-fact"),
    id: identifierSchema,
    key: identifierSchema,
    label: nonEmptyTextSchema,
    value: z.union([nonEmptyTextSchema, z.number(), z.boolean()]).optional(),
    unit: nonEmptyTextSchema.optional(),
    context: nonEmptyTextSchema.optional(),
  })
  .strict()
  .superRefine((record, context) => {
    enforcePlaceholderSafety(record, context);

    const couldBePublic =
      (record.classification === "A" || record.classification === "B") &&
      record.publicApproved;

    if (couldBePublic && record.value === undefined) {
      context.addIssue({
        code: "custom",
        message: "Publication-approved global facts require a value.",
        path: ["value"],
      });
    }
  });

export type GlobalFactRecord = z.infer<typeof globalFactRecordSchema>;

export const contentRecordSchema = z.union([
  proofRecordSchema,
  activityRecordSchema,
  programRecordSchema,
  networkOrganizationSchema,
  personRecordSchema,
  globalFactRecordSchema,
]);

export type ContentRecord = z.infer<typeof contentRecordSchema>;
