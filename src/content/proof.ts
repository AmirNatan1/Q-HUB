import { filterPublicRecords } from "./publication";
import { proofRecordSchema } from "./schema";

const maradinProofCandidate = proofRecordSchema.parse({
  contentType: "proof",
  id: "maradin-dynamic-ground-projection",
  slug: "maradin-dynamic-ground-projection",
  title: "Dynamic Ground Projection",
  summary:
    "A real-world field test of Maradin's MEMS-based laser scanning technology for vehicle-to-road visual communication.",
  recordCode: "QH / PROOF 001",
  recordStructure: "single-test",
  startup: {
    id: "maradin",
    name: "Maradin",
  },
  operatingOrganization: {
    id: "hyundai-cradle-tlv",
    name: "Hyundai CRADLE TLV",
  },
  relationshipLabels: [],
  program: {
    id: "spark",
    name: "SPARK",
  },
  domains: ["automotive", "mobility", "human-machine communication"],
  fieldCondition:
    "A need for clearer visual communication between vehicles and nearby road users across real-world operating conditions.",
  technology:
    "Maradin MEMS-based laser scanning dynamic ground projection.",
  environment:
    "Vehicle-mounted field testing across multiple projector positions, road surfaces, lighting conditions and weather conditions.",
  environmentTags: [
    "vehicle-mounted",
    "road surfaces",
    "lighting conditions",
    "weather conditions",
  ],
  test:
    "More than 60 real-world scenarios were evaluated across varying power outputs, weather conditions, road surfaces and lighting. A 15-person team evaluated brightness, image distortion and clarity on a 0–5 scale.",
  evidence:
    "The POC produced comparative field evidence across those real-world conditions. Exact internal KPI tables and proprietary measurement data remain non-public.",
  evidenceItems: [
    {
      id: "maradin-comparative-field-evidence",
      label: "Comparative field evidence",
      summary:
        "The POC produced comparative field evidence across those real-world conditions.",
      classification: "B",
      publicApproved: true,
    },
  ],
  nextStep:
    "Following an EcoMotion 2023 showcase, Maradin was selected for Hyundai's OI Lounge exhibition in Korea. A more advanced iteration was then integrated into the vehicle's front grille for that event.",
  heroMedia: {
    id: "maradin-field-aperture-video",
    kind: "video",
    src: "/media/maradin/maradin-field-aperture-approved.mp4",
    alt: "A vehicle moving through a real field environment during dynamic ground projection testing.",
    width: 1920,
    height: 1080,
    developmentPlaceholder: false,
  },
  media: [
    {
      id: "maradin-field-aperture-poster",
      kind: "image",
      src: "/media/maradin/maradin-field-aperture-poster-approved.jpg",
      alt: "A vehicle on a road at night in a real field environment.",
      width: 1920,
      height: 1080,
      developmentPlaceholder: false,
    },
    {
      id: "maradin-test-contact-video",
      kind: "video",
      src: "/media/maradin/maradin-test-contact-approved.mp4",
      alt: "Vehicle-mounted field testing in a real operating environment.",
      width: 1920,
      height: 1080,
      developmentPlaceholder: false,
    },
    {
      id: "maradin-prove-field-frame",
      kind: "image",
      src: "/media/maradin/maradin-prove-field-frame-approved.jpg",
      alt: "A red stop-hand symbol projected onto a road surface during field testing.",
      width: 1920,
      height: 1080,
      developmentPlaceholder: false,
    },
    {
      id: "maradin-real-field-still",
      kind: "image",
      src: "/media/maradin/maradin-real-field-still-approved.jpg",
      alt: "A Hyundai CRADLE vehicle parked in an open parking structure.",
      width: 3840,
      height: 2160,
      developmentPlaceholder: false,
    },
  ],
  featured: true,
  classification: "B",
  publicApproved: true,
  developmentPlaceholder: false,
});

const eligibleProofRecords = filterPublicRecords([maradinProofCandidate]);
const [eligibleMaradinProofRecord] = eligibleProofRecords;

if (!eligibleMaradinProofRecord) {
  throw new Error("The approved Maradin Proof Record failed publication filtering.");
}

/**
 * Public records are exported only after schema validation and the deny-by-default
 * publication filter. The unfiltered candidate remains private to this module.
 */
export const publicProofRecords = Object.freeze(eligibleProofRecords);
export const maradinProofRecord = Object.freeze(eligibleMaradinProofRecord);
