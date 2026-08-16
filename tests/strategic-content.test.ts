import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { filterPublicRecords } from "../src/content/publication";
import {
  foundingPartners,
  publicPartnerOrganizations,
  sparkProgram,
  strategicPartnerSchema,
  strategicPartners,
} from "../src/content/strategic";

const root = resolve(process.cwd());

const expectedPartners = [
  {
    name: "Taavura–Livnat Group",
    relationship: "founding-partner",
    src: "/media/partners/taavura-livnat-group.jpg",
    width: 534,
    height: 209,
    sha256: "10439f88775b297a20a77969fd7835a6eecf86371b2068554568a1b26f54ac8a",
  },
  {
    name: "Talcar",
    relationship: "founding-partner",
    src: "/media/partners/talcar.png",
    width: 842,
    height: 595,
    sha256: "31f5e512385b5dec8024157a9fdac62e2099c8c3b11ee2cc101315cb946c509d",
  },
  {
    name: "VDL Group",
    relationship: "strategic-partner",
    src: "/media/partners/vdl-group.png",
    width: 1280,
    height: 623,
    sha256: "769612cd1e773051de5875b65e9207b99619638bf7a333da549906f1d776eac6",
  },
  {
    name: "Hyundai Motor Group",
    relationship: "strategic-partner",
    src: "/media/partners/hyundai-motor-group-white.png",
    width: 300,
    height: 168,
    sha256: "b27d37598b6a2bc733fc75021beb304b27aa2acce1f869131a77d4e883ffc843",
  },
  {
    name: "Bazan Group",
    relationship: "strategic-partner",
    src: "/media/partners/bazan-group.png",
    width: 288,
    height: 172,
    sha256: "6d51d87fb02ba317c7808d6e785d29b54ba2516d3c1837c6b0749d980d3f5de4",
  },
] as const;

describe("Phase R strategic content", () => {
  it("publishes exactly five approved organizations with the exact relationship taxonomy", () => {
    expect(
      publicPartnerOrganizations.map((partner) => ({
        name: partner.name,
        relationship: partner.relationshipLabels[0],
      })),
    ).toEqual(
      expectedPartners.map(({ name, relationship }) => ({ name, relationship })),
    );

    expect(foundingPartnerNames()).toEqual([
      "Taavura–Livnat Group",
      "Talcar",
    ]);
    expect(strategicPartners.map((partner) => partner.name)).toEqual([
      "VDL Group",
      "Hyundai Motor Group",
      "Bazan Group",
    ]);

    publicPartnerOrganizations.forEach((partner) => {
      expect(partner.relationshipLabels).toHaveLength(1);
      expect(partner).toMatchObject({
        kind: "industrial",
        classification: "B",
        publicApproved: true,
        developmentPlaceholder: false,
      });
      expect(partner).not.toHaveProperty("summary");
      expect(partner).not.toHaveProperty("metrics");
    });
  });

  it("keeps A/B approval eligibility separate and denies every ineligible variant", () => {
    const approvedPartner = publicPartnerOrganizations[0];
    if (!approvedPartner) throw new Error("The first approved partner is missing.");

    const variants = [
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "A",
        publicApproved: true,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "B",
        publicApproved: true,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "A",
        publicApproved: false,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "B",
        publicApproved: false,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "C",
        publicApproved: true,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "D",
        publicApproved: true,
      }),
      strategicPartnerSchema.parse({
        ...approvedPartner,
        classification: "D",
        publicApproved: false,
        developmentPlaceholder: true,
      }),
    ];

    expect(
      filterPublicRecords(variants).map((partner) => partner.classification),
    ).toEqual(["A", "B"]);
  });

  it("rejects descriptions, metrics, altered labels, and flattened relationships", () => {
    const approvedPartner = publicPartnerOrganizations[0];
    if (!approvedPartner) throw new Error("The first approved partner is missing.");

    expect(
      strategicPartnerSchema.safeParse({
        ...approvedPartner,
        summary: "An unapproved partner description.",
      }).success,
    ).toBe(false);
    expect(
      strategicPartnerSchema.safeParse({
        ...approvedPartner,
        metrics: [{ label: "Unapproved metric", value: "1" }],
      }).success,
    ).toBe(false);
    expect(
      strategicPartnerSchema.safeParse({
        ...approvedPartner,
        relationshipLabels: ["industry-partner"],
      }).success,
    ).toBe(false);
    expect(
      strategicPartnerSchema.safeParse({
        ...approvedPartner,
        relationshipLabels: ["founding-partner", "strategic-partner"],
      }).success,
    ).toBe(false);
  });

  it("publishes only the approved concise SPARK proposition", () => {
    expect(sparkProgram).toMatchObject({
      contentType: "program",
      name: "SPARK",
      family: "SPARK",
      summary:
        "SPARK connects suitable startups with partners to design and execute real-world POCs.",
      audiences: ["suitable startups"],
      classification: "B",
      publicApproved: true,
      developmentPlaceholder: false,
    });

    expect(sparkProgram.summary).not.toMatch(
      /guarantee|acceptance|access to any|procurement|investment|deployment|adoption|scaling|commercial success|contract/i,
    );
  });

  it("uses only the five unchanged local approved assets and never ingests the composite", () => {
    const partnerDirectory = resolve(root, "public", "media", "partners");
    const publicAssetNames = readdirSync(partnerDirectory)
      .filter((name) => !name.startsWith("."))
      .sort();

    expect(publicAssetNames).toEqual(
      expectedPartners.map(({ src }) => basename(src)).sort(),
    );
    expect(publicAssetNames.some((name) => /composite/i.test(name))).toBe(false);

    expectedPartners.forEach((expected, index) => {
      const partner = publicPartnerOrganizations[index];
      expect(partner).toBeDefined();
      expect(partner?.logo).toMatchObject({
        src: expected.src,
        width: expected.width,
        height: expected.height,
        developmentPlaceholder: false,
      });
      expect(partner?.logo.src).not.toMatch(/^https?:\/\//i);

      const assetPath = resolve(root, "public", expected.src.replace(/^\//, ""));
      expect(existsSync(assetPath)).toBe(true);
      const digest = createHash("sha256")
        .update(readFileSync(assetPath))
        .digest("hex");
      expect(digest).toBe(expected.sha256);
    });
  });

  it("strips internal provenance from every exported strategic record", () => {
    const serialized = JSON.stringify({
      partners: publicPartnerOrganizations,
      spark: sparkProgram,
    });

    expect(serialized).not.toContain("sourceReferenceInternal");
    expect(serialized).not.toContain("phase-r:approved-");
    expect(serialized).not.toMatch(/drive\.google|\/file\/d\//i);
  });
});

function foundingPartnerNames(): string[] {
  return foundingPartners.map((partner) => partner.name);
}
