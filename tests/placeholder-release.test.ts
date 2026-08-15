import { describe, expect, it } from "vitest";
import { developmentContent } from "../src/content/development";
import { homepageActs } from "../src/content/homepage";
import {
  assertNoDevelopmentPlaceholders,
  findDevelopmentPlaceholders,
} from "../src/content/publication";

describe("pre-release placeholder detection", () => {
  it("detects every deliberately temporary structured-content family", () => {
    const findings = findDevelopmentPlaceholders(developmentContent);
    expect(findings).toHaveLength(6);
    expect(findings.every((finding) => finding.id?.startsWith("development-"))).toBe(true);
    expect(() => assertNoDevelopmentPlaceholders(developmentContent)).toThrow(
      /Development placeholders detected/,
    );
  });

  it("keeps publication-approved homepage narrative records free of placeholders", () => {
    expect(findDevelopmentPlaceholders(homepageActs)).toEqual([]);
    expect(() => assertNoDevelopmentPlaceholders(homepageActs)).not.toThrow();
  });
});
