import { describe, expect, it } from "vitest";
import { developmentContent } from "../src/content/development";
import * as homepageModule from "../src/content/homepage";
import {
  assertNoDevelopmentPlaceholders,
  findDevelopmentPlaceholders,
} from "../src/content/publication";
import {
  publicPartnerOrganizations,
  sparkProgram,
} from "../src/content/strategic";

type LegacyHomepageCompatibility = {
  findSelection: unknown;
  homepageProofFields: readonly unknown[];
};

const { homepageActs } = homepageModule;
const { findSelection, homepageProofFields } = homepageModule as
  typeof homepageModule & LegacyHomepageCompatibility;
const phaseRHomepage = homepageActs[0]?.phase === "presence";

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
    if (phaseRHomepage) {
      const resolvedHomepageContent = {
        homepageActs,
        homepageCopyDensityReport: homepageModule.homepageCopyDensityReport,
        activitySignals: homepageModule.activitySignals,
        publicPartnerOrganizations,
        sparkProgram,
      };

      expect(findDevelopmentPlaceholders(resolvedHomepageContent)).toEqual([]);
      expect(() =>
        assertNoDevelopmentPlaceholders(resolvedHomepageContent),
      ).not.toThrow();
      expect(JSON.stringify(resolvedHomepageContent)).not.toMatch(
        /approved content pending|development proof record/i,
      );
      return;
    }

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
