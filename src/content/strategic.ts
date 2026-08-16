import { z } from "zod";

import { filterPublicRecords } from "./publication";
import {
  mediaAssetSchema,
  networkOrganizationSchema,
  programRecordSchema,
} from "./schema";

export const strategicPartnerRelationshipSchema = z.enum([
  "founding-partner",
  "strategic-partner",
]);

/**
 * Phase R partners are a deliberately narrow network-organization subtype.
 * The tuple preserves one exact relationship, while the absent summary keeps
 * unapproved partner descriptions out of the public model.
 */
export const strategicPartnerSchema = networkOrganizationSchema.safeExtend({
  kind: z.literal("industrial"),
  relationshipLabels: z.tuple([strategicPartnerRelationshipSchema]),
  summary: z.never().optional(),
  logo: mediaAssetSchema,
});

const partnerCandidates = strategicPartnerSchema.array().parse([
  {
    contentType: "network-organization",
    id: "taavura-livnat-group",
    slug: "taavura-livnat-group",
    name: "Taavura–Livnat Group",
    kind: "industrial",
    relationshipLabels: ["founding-partner"],
    logo: {
      id: "taavura-livnat-group-logo",
      kind: "image",
      src: "/media/partners/taavura-livnat-group.jpg",
      alt: "Taavura–Livnat Group",
      width: 534,
      height: 209,
      developmentPlaceholder: false,
      sourceReferenceInternal: "phase-r:approved-asset:taavura-livnat-group",
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
    sourceReferenceInternal: "phase-r:approved-partner:taavura-livnat-group",
  },
  {
    contentType: "network-organization",
    id: "talcar",
    slug: "talcar",
    name: "Talcar",
    kind: "industrial",
    relationshipLabels: ["founding-partner"],
    logo: {
      id: "talcar-logo",
      kind: "image",
      src: "/media/partners/talcar.png",
      alt: "Talcar",
      width: 842,
      height: 595,
      developmentPlaceholder: false,
      sourceReferenceInternal: "phase-r:approved-asset:talcar",
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
    sourceReferenceInternal: "phase-r:approved-partner:talcar",
  },
  {
    contentType: "network-organization",
    id: "vdl-group",
    slug: "vdl-group",
    name: "VDL Group",
    kind: "industrial",
    relationshipLabels: ["strategic-partner"],
    logo: {
      id: "vdl-group-logo",
      kind: "image",
      src: "/media/partners/vdl-group.png",
      alt: "VDL Group",
      width: 1280,
      height: 623,
      developmentPlaceholder: false,
      sourceReferenceInternal: "phase-r:approved-asset:vdl-group",
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
    sourceReferenceInternal: "phase-r:approved-partner:vdl-group",
  },
  {
    contentType: "network-organization",
    id: "hyundai-motor-group",
    slug: "hyundai-motor-group",
    name: "Hyundai Motor Group",
    kind: "industrial",
    relationshipLabels: ["strategic-partner"],
    logo: {
      id: "hyundai-motor-group-logo",
      kind: "image",
      src: "/media/partners/hyundai-motor-group-white.png",
      alt: "Hyundai Motor Group",
      width: 300,
      height: 168,
      developmentPlaceholder: false,
      sourceReferenceInternal: "phase-r:approved-asset:hyundai-motor-group",
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
    sourceReferenceInternal: "phase-r:approved-partner:hyundai-motor-group",
  },
  {
    contentType: "network-organization",
    id: "bazan-group",
    slug: "bazan-group",
    name: "Bazan Group",
    kind: "industrial",
    relationshipLabels: ["strategic-partner"],
    logo: {
      id: "bazan-group-logo",
      kind: "image",
      src: "/media/partners/bazan-group.png",
      alt: "Bazan Group",
      width: 288,
      height: 172,
      developmentPlaceholder: false,
      sourceReferenceInternal: "phase-r:approved-asset:bazan-group",
    },
    classification: "B",
    publicApproved: true,
    developmentPlaceholder: false,
    sourceReferenceInternal: "phase-r:approved-partner:bazan-group",
  },
]);

const eligiblePartnerOrganizations = filterPublicRecords(partnerCandidates);

if (eligiblePartnerOrganizations.length !== partnerCandidates.length) {
  throw new Error("An approved Phase R partner failed publication filtering.");
}

export const publicPartnerOrganizations = Object.freeze(
  eligiblePartnerOrganizations,
);

export const foundingPartners = Object.freeze(
  publicPartnerOrganizations.filter(
    (partner) => partner.relationshipLabels[0] === "founding-partner",
  ),
);

export const strategicPartners = Object.freeze(
  publicPartnerOrganizations.filter(
    (partner) => partner.relationshipLabels[0] === "strategic-partner",
  ),
);

const sparkProgramCandidate = programRecordSchema.parse({
  contentType: "program",
  id: "spark",
  slug: "spark",
  name: "SPARK",
  summary:
    "SPARK connects suitable startups with partners to design and execute real-world POCs.",
  family: "SPARK",
  audiences: ["suitable startups"],
  media: [],
  classification: "B",
  publicApproved: true,
  developmentPlaceholder: false,
  sourceReferenceInternal: "phase-r:approved-program-proposition:spark",
});

const [eligibleSparkProgram] = filterPublicRecords([sparkProgramCandidate]);

if (!eligibleSparkProgram) {
  throw new Error("The approved SPARK proposition failed publication filtering.");
}

export const sparkProgram = Object.freeze(eligibleSparkProgram);
