import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = resolve(process.cwd());
const reportPath = join(root, "artifacts", "phase2-media-report.json");

const expectedAssets = [
  {
    path: "public/brand/quantum-full-logo-colors.svg",
    bytes: 5_837,
    sha256: "3b978e3a639d38e5d869afdae02d5e01eea706829ba95f1b9ee82710ffb19196",
    role: "official full-color logo",
  },
  {
    path: "public/brand/quantum-full-logo-white.svg",
    bytes: 5_834,
    sha256: "244f2bb9a95af7ce6d337e1946dedac3ace6cf01feab53c1b0c2d75e58a68032",
    role: "official white logo",
  },
  {
    path: "public/brand/quantum-icon-color.svg",
    bytes: 788,
    sha256: "04dc37965b33587fea5f4664660f8a7f9a81ec7904d39925b41c6826b80cded9",
    role: "official color icon and favicon",
  },
  {
    path: "public/brand/quantum-icon-white.svg",
    bytes: 785,
    sha256: "c660ed87bc5293bfbffa662e523343a7e83bc86cb94848912494e85e0dc9d4ff",
    role: "official white icon",
  },
  {
    path: "public/media/maradin/maradin-field-aperture-approved.mp4",
    bytes: 3_962_341,
    sha256: "daaec510c528bd7f72a97cfce1d9ede3359ec1339e28e26f524d127f09bf247c",
    role: "APERTURE documentary film",
    width: 1920,
    height: 1080,
    durationSeconds: 3.2032,
    audioTracks: 0,
  },
  {
    path: "public/media/maradin/maradin-field-aperture-poster-approved.jpg",
    bytes: 86_343,
    sha256: "6afc1a69570f2541b89b4f6a5074bec04a5d607743d91670321f550b4d6364bd",
    role: "APERTURE poster",
    width: 1920,
    height: 1080,
  },
  {
    path: "public/media/maradin/maradin-test-contact-approved.mp4",
    bytes: 4_133_483,
    sha256: "076aecf40d9e67ac29eb0b8e2d34ffc374619862a9679a6e44bc08ccfd2c113d",
    role: "TEST documentary film",
    width: 1920,
    height: 1080,
    durationSeconds: 5.005,
    audioTracks: 0,
  },
  {
    path: "public/media/maradin/maradin-prove-field-frame-approved.jpg",
    bytes: 169_156,
    sha256: "b85f1bd5413b6fe7da235e5217e16b106ae4ff0763e8deb9db6e509dbc0b8b8c",
    role: "PROVE primary still and TEST poster",
    width: 1920,
    height: 1080,
  },
  {
    path: "public/media/maradin/maradin-real-field-still-approved.jpg",
    bytes: 961_699,
    sha256: "49ab9aca0d2e3ef9e9ce164f43f9dbd1514ef815179626bef2bb4217827a6741",
    role: "PROVE supporting still",
    width: 3840,
    height: 2160,
  },
];

function collectFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(absolute) : [absolute];
  });
}

const failures = [];
const inventory = expectedAssets.map((asset) => {
  const absolute = join(root, asset.path);
  if (!existsSync(absolute)) {
    failures.push(`Missing approved asset: ${asset.path}`);
    return { ...asset, exists: false };
  }

  const bytes = statSync(absolute).size;
  const sha256 = createHash("sha256").update(readFileSync(absolute)).digest("hex");
  if (bytes !== asset.bytes) failures.push(`Byte mismatch: ${asset.path}`);
  if (sha256 !== asset.sha256) failures.push(`SHA-256 mismatch: ${asset.path}`);
  return { ...asset, exists: true, verifiedBytes: bytes, verifiedSha256: sha256 };
});

const publicMediaFiles = collectFiles(join(root, "public", "media"));
const shippedVideos = publicMediaFiles
  .filter((file) => extname(file).toLowerCase() === ".mp4")
  .map((file) => relative(root, file).replaceAll("\\", "/"))
  .sort();
const approvedVideos = expectedAssets
  .map((asset) => asset.path)
  .filter((path) => path.endsWith(".mp4"))
  .sort();

if (JSON.stringify(shippedVideos) !== JSON.stringify(approvedVideos)) {
  failures.push(`Unexpected public video inventory: ${shippedVideos.join(", ")}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  approvalDate: "2026-08-15",
  classification: "B",
  publicApproved: true,
  transformation: "Copied byte-for-byte from the approved Phase 2 derivative pack.",
  totals: {
    assets: inventory.length,
    bytes: inventory.reduce((sum, asset) => sum + (asset.exists ? asset.verifiedBytes : 0), 0),
    videoBytes: inventory
      .filter((asset) => asset.path.endsWith(".mp4"))
      .reduce((sum, asset) => sum + (asset.exists ? asset.verifiedBytes : 0), 0),
  },
  inventory,
  shippedVideos,
  failures,
};

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`Approved Phase 2 assets: ${report.totals.assets}`);
console.log(`Imported bytes: ${report.totals.bytes}`);
console.log(`Video bytes: ${report.totals.videoBytes}`);
console.log(`Machine-readable report: ${relative(root, reportPath)}`);

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
}
