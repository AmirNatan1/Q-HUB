import { describe, expect, it } from "vitest";

import * as homepageModule from "../src/content/homepage";
import { maradinProofRecord } from "../src/content/proof";
import { findDevelopmentPlaceholders } from "../src/content/publication";

type LegacyHomepageCompatibility = {
  findSelection: {
    startup: { id: string; name: string };
    title: string;
  };
  findSequence: Array<{ index: string; label: string; description: string }>;
  homepageProofFields: Array<{ key: unknown; value: unknown }>;
};

const { experiencePhases, homepageActs } = homepageModule;
const { findSelection, findSequence, homepageProofFields } = homepageModule as
  typeof homepageModule & LegacyHomepageCompatibility;
const phaseRHomepage = homepageActs[0]?.phase === "presence";

describe("Phase 2 homepage content", () => {
  it("keeps the complete six-act narrative in canonical order", () => {
    if (phaseRHomepage) {
      expect(homepageActs.map((act) => act.phase)).toEqual(experiencePhases);
      expect(homepageActs).toHaveLength(7);
      return;
    }
    expect(homepageActs.map((act) => act.phase)).toEqual(experiencePhases);
    expect(homepageActs).toHaveLength(6);
    expect(findDevelopmentPlaceholders(homepageActs)).toEqual([]);
    expect(homepageActs.every((act) => act.publicApproved)).toBe(true);
  });

  it("keeps SIGNAL Quantum-led and grounded in approved business truth", () => {
    if (phaseRHomepage) {
      expect(homepageActs[0]?.title).toEqual(["Quantum Hub"]);
      expect(homepageActs[0]?.supporting).toBe("Where industry meets technology.");
      return;
    }
    const signal = homepageActs[0];
    const signalText = JSON.stringify(signal);

    expect(signal?.title).toEqual([
      "Turn industrial needs",
      "into field evidence.",
    ]);
    expect(signal?.supporting).toBe(
      "Industrial need → technology search → field test → evidence.",
    );
    expect(signalText).not.toMatch(/Maradin|Hyundai/i);
  });

  it("grounds NEED, FIND, TEST and PROVE in the approved Proof Record", () => {
    if (phaseRHomepage) {
      expect(homepageActs.find((act) => act.phase === "method")?.title).toEqual([
        "Find. Test. Prove.",
      ]);
      expect(JSON.stringify(homepageActs)).not.toMatch(/Maradin|Dynamic Ground Projection/i);
      return;
    }
    const [, aperture, need, find, test, prove] = homepageActs;

    expect(aperture?.supporting).toContain("real-world field test");
    expect(need?.supporting).toBe(maradinProofRecord.fieldCondition);
    expect(find?.supporting).toContain("Maradin");
    expect(test?.supporting).toContain("more than 60 real-world scenarios");
    expect(prove?.supporting).toContain("comparative field evidence");
    expect(findSequence.at(-1)).toEqual({
      index: "03",
      label: "Maradin",
      description: "Dynamic ground projection",
    });
    expect(findSelection).toMatchObject({
      startup: { id: "maradin", name: "Maradin" },
      title: "Dynamic Ground Projection",
    });
  });

  it("renders evidence and a next step without fabricating a decision", () => {
    if (phaseRHomepage) {
      const evidence = homepageActs.find((act) => act.phase === "evidence");
      expect(evidence?.action).toEqual({ label: "Explore Proof", href: "/proof/" });
      expect(evidence).not.toHaveProperty("decision");
      return;
    }
    expect(homepageProofFields.map((field) => field.key)).toEqual([
      "field-condition",
      "technology",
      "environment",
      "test",
      "evidence",
      "next-step",
    ]);
    expect(homepageProofFields.every((field) => Boolean(field.value))).toBe(true);
    expect(homepageProofFields.map((field) => String(field.key))).not.toContain(
      "decision",
    );
    expect(maradinProofRecord).not.toHaveProperty("decision");
    expect(maradinProofRecord).not.toHaveProperty("date");
    expect(maradinProofRecord).not.toHaveProperty("location");
  });

  it("does not claim a commercial outcome", () => {
    if (phaseRHomepage) {
      expect(JSON.stringify(homepageActs)).not.toMatch(
        /commercial success|commercialized|production adoption|sales outcome/i,
      );
      return;
    }
    const publicNarrative = JSON.stringify({
      homepageActs,
      homepageProofFields,
      maradinProofRecord,
    });

    expect(publicNarrative).not.toMatch(
      /commercial success|commercialized|production adoption|sales outcome/i,
    );
    expect(maradinProofRecord.relationshipLabels).toEqual([]);
  });
});
