import { describe, expect, it } from "vitest";

import { developmentContent } from "../src/content/development";
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
