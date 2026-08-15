import { describe, expect, it } from "vitest";

import { developmentContent } from "../src/content/development";
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
    expect(Object.keys(maradinProofRecord).sort()).toEqual(
      [
        "classification",
        "contentType",
        "developmentPlaceholder",
        "domains",
        "environment",
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
    expect(maradinProofRecord).not.toHaveProperty("sourceReferenceInternal");
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

    expect(findDevelopmentPlaceholders(developmentContent)).toHaveLength(6);
    expect(() => assertNoDevelopmentPlaceholders(developmentContent)).toThrow(
      /Development placeholders detected/,
    );
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
