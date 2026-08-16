import { describe, expect, it } from "vitest";

import {
  developmentContent,
  developmentProofRecords,
} from "../src/content/development";
import {
  maradinProofRecord,
  publicProofRecords,
} from "../src/content/proof";
import {
  assertNoDevelopmentPlaceholders,
  filterPublicRecords,
  findDevelopmentPlaceholders,
  isDevelopmentPlaceholder,
  isPubliclyEligible,
  stripInternalSourceReferences,
  toPublicRecord,
} from "../src/content/publication";
import {
  contentRecordSchema,
  proofEvidenceItemSchema,
  proofPhaseSchema,
  proofRecordSchema,
  type PublicationClassification,
} from "../src/content/schema";

function proofFixture(
  classification: PublicationClassification,
  publicApproved: boolean,
) {
  return proofRecordSchema.parse({
    contentType: "proof",
    id: `publication-${classification.toLowerCase()}-${String(publicApproved)}`,
    slug: `publication-${classification.toLowerCase()}-${String(publicApproved)}`,
    title: "Publication policy fixture",
    summary: "Test-only content.",
    classification,
    publicApproved,
    developmentPlaceholder: false,
    sourceReferenceInternal: "internal://fixture/source",
  });
}

describe("Proof record structures", () => {
  it("validates the authorized single-test and multi-phase additions", () => {
    const phase = proofPhaseSchema.parse({
      id: "test-phase-one",
      label: "Test phase one",
      summary: "Test-only phase summary.",
      status: "completed",
      classification: "A",
      publicApproved: true,
    });
    const evidenceItem = proofEvidenceItemSchema.parse({
      id: "test-evidence-one",
      label: "Test evidence one",
      value: "Test-only evidence value.",
      classification: "B",
      publicApproved: true,
    });
    const multiPhase = proofRecordSchema.parse({
      contentType: "proof",
      id: "test-multi-phase",
      slug: "test-multi-phase",
      title: "Test multi-phase record",
      summary: "Test-only multi-phase record.",
      recordCode: "QH / TEST 001",
      recordStructure: "multi-phase",
      environmentTags: ["test-only environment"],
      phases: [phase],
      evidenceItems: [evidenceItem],
      classification: "A",
      publicApproved: true,
      developmentPlaceholder: false,
    });

    expect(multiPhase).toMatchObject({
      recordCode: "QH / TEST 001",
      recordStructure: "multi-phase",
      environmentTags: ["test-only environment"],
      phases: [{ id: "test-phase-one" }],
      evidenceItems: [{ id: "test-evidence-one" }],
    });
  });

  it("rejects empty optional collections and incomplete structural items", () => {
    expect(
      proofRecordSchema.safeParse({
        ...proofFixture("A", true),
        environmentTags: [],
      }).success,
    ).toBe(false);
    expect(
      proofRecordSchema.safeParse({
        ...proofFixture("A", true),
        recordStructure: "multi-phase",
      }).success,
    ).toBe(false);
    expect(
      proofEvidenceItemSchema.safeParse({
        id: "test-empty-evidence",
        label: "Test empty evidence",
        classification: "A",
        publicApproved: true,
      }).success,
    ).toBe(false);
  });
});

describe("publication eligibility", () => {
  it.each([
    ["A", true, true],
    ["A", false, false],
    ["B", true, true],
    ["B", false, false],
    ["C", true, false],
    ["C", false, false],
    ["D", true, false],
    ["D", false, false],
  ] as const)(
    "classification %s with approved=%s yields public=%s",
    (classification, approved, expected) => {
      expect(isPubliclyEligible(proofFixture(classification, approved))).toBe(
        expected,
      );
    },
  );

  it("filters denied records rather than leaking them into public output", () => {
    const records = [
      proofFixture("A", true),
      proofFixture("B", true),
      proofFixture("B", false),
      proofFixture("C", true),
      proofFixture("D", true),
    ];

    expect(filterPublicRecords(records).map((record) => record.classification)).toEqual([
      "A",
      "B",
    ]);
  });

  it("publishes the schema-valid B-approved Maradin record", () => {
    expect(proofRecordSchema.safeParse(maradinProofRecord).success).toBe(true);
    expect(isPubliclyEligible(maradinProofRecord)).toBe(true);
    expect(publicProofRecords).toEqual([maradinProofRecord]);
  });

  it.each([
    ["B", false],
    ["C", true],
    ["D", true],
  ] as const)(
    "denies the Maradin record if classification=%s and approved=%s",
    (classification, publicApproved) => {
      expect(
        toPublicRecord({
          ...maradinProofRecord,
          classification,
          publicApproved,
        }),
      ).toBeNull();
    },
  );
});

describe("public serialization", () => {
  it("independently filters denied nested phases and evidence items", () => {
    const governedRecord = proofRecordSchema.parse({
      contentType: "proof",
      id: "nested-publication-test",
      slug: "nested-publication-test",
      title: "Nested publication test",
      summary: "Test-only nested publication record.",
      recordStructure: "multi-phase",
      phases: [
        {
          id: "public-phase",
          label: "Public phase",
          summary: "Test-only approved phase.",
          classification: "A",
          publicApproved: true,
          sourceReferenceInternal: "internal://phase/public",
        },
        {
          id: "unapproved-phase",
          label: "Unapproved phase",
          summary: "nested-unapproved-phase-marker",
          classification: "B",
          publicApproved: false,
          sourceReferenceInternal: "internal://phase/unapproved",
        },
        {
          id: "confidential-phase",
          label: "Confidential phase",
          summary: "nested-confidential-phase-marker",
          classification: "C",
          publicApproved: true,
          sourceReferenceInternal: "internal://phase/confidential",
        },
      ],
      evidenceItems: [
        {
          id: "public-evidence",
          label: "Public evidence",
          summary: "Test-only approved evidence.",
          classification: "B",
          publicApproved: true,
          sourceReferenceInternal: "internal://evidence/public",
        },
        {
          id: "unapproved-evidence",
          label: "Unapproved evidence",
          summary: "nested-unapproved-evidence-marker",
          classification: "B",
          publicApproved: false,
          sourceReferenceInternal: "internal://evidence/unapproved",
        },
        {
          id: "unverified-evidence",
          label: "Unverified evidence",
          value: "nested-unverified-evidence-marker",
          classification: "D",
          publicApproved: true,
          sourceReferenceInternal: "internal://evidence/unverified",
        },
      ],
      classification: "A",
      publicApproved: true,
      developmentPlaceholder: false,
      sourceReferenceInternal: "internal://record/source",
    });

    const publicRecord = toPublicRecord(governedRecord);
    const serialized = JSON.stringify(publicRecord);

    expect(publicRecord?.phases?.map((phase) => phase.id)).toEqual([
      "public-phase",
    ]);
    expect(publicRecord?.evidenceItems?.map((item) => item.id)).toEqual([
      "public-evidence",
    ]);
    expect(serialized).not.toContain("nested-unapproved-phase-marker");
    expect(serialized).not.toContain("nested-confidential-phase-marker");
    expect(serialized).not.toContain("nested-unapproved-evidence-marker");
    expect(serialized).not.toContain("nested-unverified-evidence-marker");
    expect(serialized).not.toContain("sourceReferenceInternal");
    expect(serialized).not.toContain("internal://");
  });

  it("removes development media nested inside an otherwise public item", () => {
    const governedRecord = proofRecordSchema.parse({
      contentType: "proof",
      id: "nested-media-test",
      slug: "nested-media-test",
      title: "Nested media test",
      summary: "Test-only nested media record.",
      phases: [
        {
          id: "phase-with-media",
          label: "Phase with media",
          summary: "Test-only approved phase.",
          media: [
            {
              id: "public-phase-media",
              kind: "image",
              src: "/test-public.jpg",
              alt: "Test-only public media.",
              developmentPlaceholder: false,
            },
            {
              id: "development-phase-media",
              kind: "image",
              src: "/development-test-only.jpg",
              alt: "Test-only development media.",
              developmentPlaceholder: true,
            },
          ],
          classification: "A",
          publicApproved: true,
        },
      ],
      classification: "A",
      publicApproved: true,
      developmentPlaceholder: false,
    });

    const publicRecord = toPublicRecord(governedRecord);

    expect(publicRecord?.phases?.[0]?.media?.map((asset) => asset.id)).toEqual([
      "public-phase-media",
    ]);
    expect(JSON.stringify(publicRecord)).not.toContain(
      "development-test-only.jpg",
    );
  });

  it("omits an optional nested collection when every item is denied", () => {
    const governedRecord = proofRecordSchema.parse({
      contentType: "proof",
      id: "all-nested-items-denied",
      slug: "all-nested-items-denied",
      title: "All nested items denied",
      summary: "Test-only nested denial record.",
      evidenceItems: [
        {
          id: "only-denied-evidence",
          label: "Only denied evidence",
          summary: "denied-evidence-marker",
          classification: "B",
          publicApproved: false,
        },
      ],
      classification: "A",
      publicApproved: true,
      developmentPlaceholder: false,
    });

    const publicRecord = toPublicRecord(governedRecord);

    expect(publicRecord).not.toHaveProperty("evidenceItems");
    expect(JSON.stringify(publicRecord)).not.toContain("denied-evidence-marker");
  });

  it("recursively strips every internal source reference", () => {
    const publicRecord = toPublicRecord({
      ...proofFixture("A", true),
      nested: {
        visible: "public",
        sourceReferenceInternal: "internal://nested/source",
      },
    });

    expect(publicRecord).not.toBeNull();
    expect(publicRecord).not.toHaveProperty("sourceReferenceInternal");
    expect(publicRecord).not.toHaveProperty("nested.sourceReferenceInternal");
    expect(publicRecord).toHaveProperty("nested.visible", "public");
    expect(JSON.stringify(publicRecord)).not.toContain("internal://");
  });

  it("can sanitize nested arrays independent of eligibility filtering", () => {
    const sanitized = stripInternalSourceReferences({
      items: [
        {
          label: "visible",
          sourceReferenceInternal: "internal://array/source",
        },
      ],
    });

    expect(sanitized).toEqual({ items: [{ label: "visible" }] });
  });

  it("serializes only approved public Maradin fields", () => {
    if (!("evidenceItems" in maradinProofRecord)) {
      expect(Object.keys(maradinProofRecord).sort()).toEqual(
        [
          "classification",
          "contentType",
          "developmentPlaceholder",
          "domains",
          "environment",
          "environmentTags",
          "evidence",
          "featured",
          "fieldCondition",
          "heroMedia",
          "id",
          "media",
          "nextStep",
          "operatingOrganization",
          "program",
          "publicApproved",
          "recordCode",
          "recordStructure",
          "relatedProof",
          "relationshipLabels",
          "slug",
          "startup",
          "summary",
          "technology",
          "test",
          "title",
        ].sort(),
      );
      expect(maradinProofRecord).not.toHaveProperty("decision");
      expect(maradinProofRecord).not.toHaveProperty("date");
      expect(maradinProofRecord).not.toHaveProperty("location");
      expect(maradinProofRecord).not.toHaveProperty("phases");
      expect(maradinProofRecord).not.toHaveProperty("evidenceItems");
      expect(maradinProofRecord).not.toHaveProperty("sourceReferenceInternal");
      expect(maradinProofRecord).toMatchObject({
        recordCode: "QH / PROOF 001",
        recordStructure: "single-test",
        evidence:
          "The POC produced comparative field evidence across those real-world conditions.",
      });
      expect(JSON.stringify(maradinProofRecord)).not.toMatch(
        /Exact internal KPI tables|proprietary measurement data|remain non-public/i,
      );
      return;
    }

    expect(Object.keys(maradinProofRecord).sort()).toEqual(
      [
        "classification",
        "contentType",
        "developmentPlaceholder",
        "domains",
        "environment",
        "environmentTags",
        "evidence",
        "evidenceItems",
        "featured",
        "fieldCondition",
        "heroMedia",
        "id",
        "media",
        "nextStep",
        "operatingOrganization",
        "program",
        "publicApproved",
        "recordCode",
        "recordStructure",
        "relatedProof",
        "relationshipLabels",
        "slug",
        "startup",
        "summary",
        "technology",
        "test",
        "title",
      ].sort(),
    );
    expect(maradinProofRecord).not.toHaveProperty("decision");
    expect(maradinProofRecord).not.toHaveProperty("date");
    expect(maradinProofRecord).not.toHaveProperty("location");
    expect(maradinProofRecord).not.toHaveProperty("phases");
    expect(maradinProofRecord).not.toHaveProperty("sourceReferenceInternal");
    expect(maradinProofRecord).toMatchObject({
      recordCode: "QH / PROOF 001",
      recordStructure: "single-test",
      evidenceItems: [
        {
          id: "maradin-comparative-field-evidence",
          classification: "B",
          publicApproved: true,
        },
      ],
    });
  });
});

describe("development placeholder safety", () => {
  it("makes every development content family schema-valid and detectable", () => {
    const records = Object.values(developmentContent).flat();

    records.forEach((record) => {
      expect(contentRecordSchema.safeParse(record).success).toBe(true);
      expect(isDevelopmentPlaceholder(record)).toBe(true);
      expect(toPublicRecord(record)).toBeNull();
    });

    expect(findDevelopmentPlaceholders(developmentContent)).toHaveLength(9);
    expect(() => assertNoDevelopmentPlaceholders(developmentContent)).toThrow(
      /Development placeholders detected/,
    );
  });

  it("keeps all four structural Proof shapes test-only and non-public", () => {
    expect(developmentProofRecords.map((record) => record.id)).toEqual([
      "development-proof-single",
      "development-proof-multi-phase",
      "development-proof-no-outcome",
      "development-proof-partial",
    ]);
    expect(filterPublicRecords(developmentProofRecords)).toEqual([]);

    const [single, multiPhase, noOutcome, partial] = developmentProofRecords;

    expect(single).toMatchObject({
      recordStructure: "single-test",
      nextStep: "Non-factual next-step slot.",
    });
    expect(single).not.toHaveProperty("decision");

    expect(multiPhase).toMatchObject({
      recordStructure: "multi-phase",
    });
    expect(multiPhase?.phases?.map((phase) => phase.status)).toEqual([
      "completed",
      "ongoing",
      "planned",
    ]);

    expect(noOutcome).toHaveProperty("evidence");
    expect(noOutcome).not.toHaveProperty("decision");
    expect(noOutcome).not.toHaveProperty("nextStep");

    expect(partial).not.toHaveProperty("date");
    expect(partial).not.toHaveProperty("location");
    expect(partial).not.toHaveProperty("decision");
    expect(partial).not.toHaveProperty("nextStep");

    developmentProofRecords.forEach((record) => {
      expect(record.classification).toBe("D");
      expect(record.publicApproved).toBe(false);
      expect(record.developmentPlaceholder).toBe(true);
      expect(toPublicRecord(record)).toBeNull();
    });
  });

  it("does not materialize unsupported optional Proof fields", () => {
    const partialPublicRecord = toPublicRecord(
      proofRecordSchema.parse({
        contentType: "proof",
        id: "public-partial-shape",
        slug: "public-partial-shape",
        title: "Public partial shape",
        summary: "Test-only public partial shape.",
        fieldCondition: "Test-only field condition.",
        evidence: "Test-only evidence.",
        classification: "A",
        publicApproved: true,
        developmentPlaceholder: false,
      }),
    );

    expect(partialPublicRecord).not.toHaveProperty("decision");
    expect(partialPublicRecord).not.toHaveProperty("nextStep");
    expect(partialPublicRecord).not.toHaveProperty("date");
    expect(partialPublicRecord).not.toHaveProperty("location");
    expect(partialPublicRecord).not.toHaveProperty("phases");
    expect(partialPublicRecord).not.toHaveProperty("evidenceItems");
    expect(Object.values(partialPublicRecord ?? {})).not.toContain(undefined);
  });

  it("rejects placeholder metadata that could be mistaken for public content", () => {
    const unsafePlaceholder = {
      ...developmentContent.proof[0],
      classification: "A",
      publicApproved: true,
    };

    expect(proofRecordSchema.safeParse(unsafePlaceholder).success).toBe(false);
  });
});
