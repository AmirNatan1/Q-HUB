import { describe, expect, it } from "vitest";

import {
  accessMobileCopyStateReport,
  accessMobileCopyStates,
  activitySignals,
  experiencePhases,
  homepageActs,
  homepageCopyCeilings,
  homepageCopyDensityReport,
  proofIndexHref,
  workWithQuantumHref,
} from "../src/content/homepage";
import { findDevelopmentPlaceholders } from "../src/content/publication";
import {
  publicPartnerOrganizations,
  sparkProgram,
} from "../src/content/strategic";

const deniedHomepageProjectLanguage = [
  "Maradin",
  "Dynamic Ground Projection",
  "Hyundai CRADLE TLV",
  "MEMS-based",
  "60 real-world scenarios",
  "15-person",
  "0–5",
  "EcoMotion 2023",
  "OI Lounge",
  "front-grille integration",
] as const;

describe("Phase R homepage content", () => {
  it("publishes the seven Quantum-led acts in canonical order", () => {
    expect(homepageActs.map((act) => act.phase)).toEqual(experiencePhases);
    expect(homepageActs).toHaveLength(7);
    expect(findDevelopmentPlaceholders(homepageActs)).toEqual([]);
    expect(homepageActs.every((act) => act.publicApproved)).toBe(true);
  });

  it("uses the exact approved public anchors and working destinations", () => {
    expect(homepageActs.map((act) => act.title)).toEqual([
      ["Quantum Hub"],
      ["Access to the field."],
      ["Your technology.", "Real industrial context."],
      ["Find. Test. Prove."],
      ["Quantum in motion."],
      ["Real field.", "Documented evidence."],
      ["Take your technology", "into the field."],
    ]);
    expect(homepageActs[0]?.supporting).toBe("Where industry meets technology.");
    expect(homepageActs[2]?.supporting).toBe(sparkProgram.summary);
    expect(homepageActs[3]?.supporting).toBe(
      "From industrial need to field evidence.",
    );
    expect(homepageActs[2]?.action).toEqual({
      label: "Start a conversation",
      href: workWithQuantumHref,
    });
    expect(homepageActs[5]?.action).toEqual({
      label: "Explore Proof",
      href: proofIndexHref,
    });
    expect(homepageActs[6]?.action).toEqual({
      label: "Work with Quantum",
      href: workWithQuantumHref,
    });
  });

  it("contains only approved activity categories and no guarantee language", () => {
    expect(activitySignals).toEqual([
      "Field testing",
      "Programs",
      "Partner engagement",
      "Global ecosystem",
    ]);
    expect(JSON.stringify({ homepageActs, activitySignals, sparkProgram })).not.toMatch(
      /guarantee|procurement|investment|deployment|adoption|scaling|commercial success|contract/i,
    );
  });

  it("removes every denied project-specific phrase from homepage content", () => {
    const homepageContent = JSON.stringify({
      homepageActs,
      activitySignals,
      partners: publicPartnerOrganizations,
    });
    deniedHomepageProjectLanguage.forEach((phrase) => {
      expect(homepageContent).not.toContain(phrase);
    });
  });

  it("passes every copy-density ceiling with the required partner labels included", () => {
    expect(homepageCopyDensityReport).toHaveLength(7);
    expect(homepageCopyDensityReport.every((result) => result.pass)).toBe(true);
    homepageCopyDensityReport.forEach((result) => {
      expect(result.primaryWords).toBeLessThanOrEqual(homepageCopyCeilings.primaryWords);
      expect(result.supportingWords).toBeLessThanOrEqual(homepageCopyCeilings.supportingWords);
      expect(result.longestParagraphWords).toBeLessThanOrEqual(homepageCopyCeilings.paragraphWords);
      expect(result.settledNarrativeWords).toBeLessThanOrEqual(homepageCopyCeilings.settledNarrativeWords);
      expect(result.mobileVisibleWords).toBeLessThanOrEqual(homepageCopyCeilings.mobileVisibleWords);
    });

    const access = homepageCopyDensityReport.find((result) => result.phase === "access");
    expect(access).toMatchObject({
      settledNarrativeWords: 29,
      mobileVisibleWords: 19,
      pass: true,
    });
    expect(accessMobileCopyStateReport).toEqual([
      { state: "opening", visibleWords: 4, pass: true },
      { state: "strategic", visibleWords: 19, pass: true },
      { state: "founding", visibleWords: 10, pass: true },
    ]);
    expect(accessMobileCopyStates.strategic).toContain("Strategic Partner");
    expect(accessMobileCopyStates.founding).toContain("Founding Partner");
  });
});
