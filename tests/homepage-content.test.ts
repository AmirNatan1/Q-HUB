import { describe, expect, it } from "vitest";

import {
  experiencePhases,
  findSelection,
  findSequence,
  homepageActs,
  homepageProofFields,
} from "../src/content/homepage";
import { maradinProofRecord } from "../src/content/proof";
import { findDevelopmentPlaceholders } from "../src/content/publication";

describe("Phase 2 homepage content", () => {
  it("keeps the complete six-act narrative in canonical order", () => {
    expect(homepageActs.map((act) => act.phase)).toEqual(experiencePhases);
    expect(homepageActs).toHaveLength(6);
    expect(findDevelopmentPlaceholders(homepageActs)).toEqual([]);
    expect(homepageActs.every((act) => act.publicApproved)).toBe(true);
  });

  it("keeps SIGNAL Quantum-led and grounded in approved business truth", () => {
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
