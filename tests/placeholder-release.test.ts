import { describe, expect, it } from "vitest";
import { developmentContent } from "../src/content/development";
import {
  findSelection,
  homepageActs,
  homepageProofFields,
} from "../src/content/homepage";
import {
  assertNoDevelopmentPlaceholders,
  findDevelopmentPlaceholders,
} from "../src/content/publication";

describe("pre-release placeholder detection", () => {
  it("keeps intentionally unresolved later-phase content detectable", () => {
    const findings = findDevelopmentPlaceholders(developmentContent);
    expect(findings).toHaveLength(9);
    expect(findings.every((finding) => finding.id?.startsWith("development-"))).toBe(true);
    expect(
      findings
        .map((finding) => finding.id)
        .filter((id) => id?.startsWith("development-proof-")),
    ).toEqual([
      "development-proof-single",
      "development-proof-multi-phase",
      "development-proof-no-outcome",
      "development-proof-partial",
    ]);
    expect(() => assertNoDevelopmentPlaceholders(developmentContent)).toThrow(
      /Development placeholders detected/,
    );
  });

  it("keeps resolved homepage production content free of placeholders", () => {
    const resolvedHomepageContent = {
      homepageActs,
      homepageProofFields,
      findSelection,
    };

    expect(findDevelopmentPlaceholders(resolvedHomepageContent)).toEqual([]);
    expect(() =>
      assertNoDevelopmentPlaceholders(resolvedHomepageContent),
    ).not.toThrow();
    expect(JSON.stringify(resolvedHomepageContent)).not.toMatch(
      /approved content pending|development proof record/i,
    );
  });
});
