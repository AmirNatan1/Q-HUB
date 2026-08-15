import { chromium } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselineDirectory = path.join(rootDirectory, "artifacts", "review");
const repairDirectory = path.join(baselineDirectory, "repair");
const outputPath = path.join(repairDirectory, "analysis.json");

const signalBackgroundRegions = [
  [0.03, 0.085, 0.89, 0.19],
  [0.78, 0.19, 0.89, 0.82],
  [0.03, 0.74, 0.89, 0.93],
  [0.03, 0.19, 0.12, 0.74],
];
const apertureFieldRegions = [[0.46, 0.085, 0.9, 0.96]];
const stageRegions = [[0.02, 0.085, 0.96, 0.97]];

function round(value) {
  return Number(value.toFixed(3));
}

async function dataUrlFor(filePath) {
  const bytes = await readFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const mime = extension === ".png" ? "image/png" : "image/jpeg";
  return {
    dataUrl: `data:${mime};base64,${bytes.toString("base64")}`,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

async function analyzeImage(page, filePath, regions, includeGrid = false) {
  const source = await dataUrlFor(filePath);
  const measurements = await page.evaluate(
    async ({ dataUrl, regions: normalizedRegions, includeGrid: shouldIncludeGrid }) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("Canvas 2D context is unavailable.");
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const width = canvas.width;
      const height = canvas.height;

      function classify(offset) {
        const red = pixels[offset] / 255;
        const green = pixels[offset + 1] / 255;
        const blue = pixels[offset + 2] / 255;
        const maximum = Math.max(red, green, blue);
        const minimum = Math.min(red, green, blue);
        const delta = maximum - minimum;
        let hue = 0;
        if (delta > 0) {
          if (maximum === red) hue = 60 * (((green - blue) / delta) % 6);
          if (maximum === green) hue = 60 * ((blue - red) / delta + 2);
          if (maximum === blue) hue = 60 * ((red - green) / delta + 4);
        }
        if (hue < 0) hue += 360;
        const saturation = maximum === 0 ? 0 : delta / maximum;
        const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
        return {
          dark: luminance <= 0.16,
          magenta: hue >= 300 && hue <= 350 && saturation >= 0.28 && maximum >= 0.16,
          warm:
            hue >= 5 &&
            hue <= 38 &&
            saturation >= 0.28 &&
            maximum >= 0.2 &&
            luminance >= 0.17,
        };
      }

      function withinRegions(x, y, selectedRegions) {
        const normalizedX = x / width;
        const normalizedY = y / height;
        return selectedRegions.some(
          ([left, top, right, bottom]) =>
            normalizedX >= left && normalizedX < right && normalizedY >= top && normalizedY < bottom,
        );
      }

      let sampled = 0;
      let magenta = 0;
      let warm = 0;
      let dark = 0;
      let thickMagenta = 0;
      const stride = 2;
      const radius = 3;

      for (let y = 0; y < height; y += stride) {
        for (let x = 0; x < width; x += stride) {
          if (!withinRegions(x, y, normalizedRegions)) continue;
          const classification = classify((y * width + x) * 4);
          sampled += 1;
          if (classification.magenta) magenta += 1;
          if (classification.warm) warm += 1;
          if (classification.dark) dark += 1;

          if (
            classification.magenta &&
            x >= radius &&
            x < width - radius &&
            y >= radius &&
            y < height - radius
          ) {
            const neighbors = [
              [x - radius, y],
              [x + radius, y],
              [x, y - radius],
              [x, y + radius],
              [x - radius, y - radius],
              [x + radius, y - radius],
              [x - radius, y + radius],
              [x + radius, y + radius],
            ];
            if (neighbors.every(([neighborX, neighborY]) => classify((neighborY * width + neighborX) * 4).magenta)) {
              thickMagenta += 1;
            }
          }
        }
      }

      const spatialGrid = [];
      if (shouldIncludeGrid) {
        const columns = 4;
        const rows = 3;
        const stageTop = 0.085;
        const stageBottom = 0.97;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const cell = [
              column / columns,
              stageTop + ((stageBottom - stageTop) * row) / rows,
              (column + 1) / columns,
              stageTop + ((stageBottom - stageTop) * (row + 1)) / rows,
            ];
            let cellSampled = 0;
            let cellWarm = 0;
            let cellDark = 0;
            const startX = Math.floor(cell[0] * width);
            const endX = Math.ceil(cell[2] * width);
            const startY = Math.floor(cell[1] * height);
            const endY = Math.ceil(cell[3] * height);
            for (let y = startY; y < endY; y += 3) {
              for (let x = startX; x < endX; x += 3) {
                const classification = classify((y * width + x) * 4);
                cellSampled += 1;
                if (classification.warm) cellWarm += 1;
                if (classification.dark) cellDark += 1;
              }
            }
            spatialGrid.push({
              column,
              row,
              warmPercent: (cellWarm / Math.max(cellSampled, 1)) * 100,
              darkPercent: (cellDark / Math.max(cellSampled, 1)) * 100,
            });
          }
        }
      }

      return {
        width,
        height,
        sampled,
        magentaPercent: (magenta / Math.max(sampled, 1)) * 100,
        thickMagentaPercent: (thickMagenta / Math.max(sampled, 1)) * 100,
        warmPercent: (warm / Math.max(sampled, 1)) * 100,
        darkPercent: (dark / Math.max(sampled, 1)) * 100,
        spatialGrid,
      };
    },
    { dataUrl: source.dataUrl, regions, includeGrid },
  );

  return {
    file: path.relative(rootDirectory, filePath).replaceAll("\\", "/"),
    sha256: source.sha256,
    ...Object.fromEntries(
      Object.entries(measurements).map(([key, value]) => [
        key,
        typeof value === "number" && !Number.isInteger(value) ? round(value) : value,
      ]),
    ),
    spatialGrid: measurements.spatialGrid.map((cell) => ({
      ...cell,
      warmPercent: round(cell.warmPercent),
      darkPercent: round(cell.darkPercent),
    })),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  const signalBefore = await analyzeImage(
    page,
    path.join(baselineDirectory, "desktop-signal.jpg"),
    signalBackgroundRegions,
  );
  const signalAfter = await analyzeImage(
    page,
    path.join(repairDirectory, "desktop-signal.png"),
    signalBackgroundRegions,
  );
  const apertureBefore = await analyzeImage(
    page,
    path.join(baselineDirectory, "desktop-aperture.jpg"),
    apertureFieldRegions,
    true,
  );
  const apertureAfter = await analyzeImage(
    page,
    path.join(repairDirectory, "desktop-aperture.png"),
    apertureFieldRegions,
    true,
  );
  const proveAfter = await analyzeImage(
    page,
    path.join(repairDirectory, "desktop-prove.png"),
    stageRegions,
  );

  const signalChecks = {
    magentaAtMostHalfBaseline:
      signalAfter.magentaPercent <= signalBefore.magentaPercent * 0.5,
    magentaAtMost15Point7Percent: signalAfter.magentaPercent <= 15.7,
    thickCoreAtMost35PercentBaseline:
      signalAfter.thickMagentaPercent <= signalBefore.thickMagentaPercent * 0.35,
    thickCoreAtMost6Point4Percent: signalAfter.thickMagentaPercent <= 6.4,
    darkSpaceGainsTenPoints: signalAfter.darkPercent >= signalBefore.darkPercent + 10,
    darkSpaceAtLeast68Point1Percent: signalAfter.darkPercent >= 68.1,
  };
  const warmDominantCells = apertureAfter.spatialGrid.filter(
    (cell) => cell.warmPercent >= 12 && cell.warmPercent > cell.darkPercent,
  ).length;
  const darkDominantCells = apertureAfter.spatialGrid.filter(
    (cell) => cell.darkPercent >= 55 && cell.darkPercent > cell.warmPercent,
  ).length;
  const apertureChecks = {
    warmFieldAtLeast12Percent: apertureAfter.warmPercent >= 12,
    warmFieldAtLeastFourTimesBaseline:
      apertureAfter.warmPercent >= apertureBefore.warmPercent * 4,
    thickMagentaAtMost4Percent: apertureAfter.thickMagentaPercent <= 4,
    atLeastTwoWarmDominantCells: warmDominantCells >= 2,
    atLeastTwoDarkDominantCells: darkDominantCells >= 2,
  };
  const proveChecks = {
    magentaAtMostPoint1Percent: proveAfter.magentaPercent <= 0.1,
  };
  const pass = [...Object.values(signalChecks), ...Object.values(apertureChecks), ...Object.values(proveChecks)].every(Boolean);

  const report = {
    generatedAt: new Date().toISOString(),
    status: pass ? "PASS" : "FAIL",
    methodology: {
      decoder: "Chromium canvas ImageData",
      samplingStridePixels: 2,
      signalRoi: "Background-safe bands exclude intentional pink headline typography and the phase rail.",
      thickCore: "Magenta samples whose eight radius-3px neighbors also classify as magenta.",
      note: "Pixel measurements support, but do not replace, human visual inspection.",
    },
    signal: { before: signalBefore, after: signalAfter, checks: signalChecks },
    aperture: {
      before: apertureBefore,
      after: apertureAfter,
      warmDominantCells,
      darkDominantCells,
      checks: apertureChecks,
    },
    prove: { after: proveAfter, checks: proveChecks },
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Repair evidence analysis: ${report.status}`);
  console.log(`Report: ${path.relative(rootDirectory, outputPath).replaceAll("\\", "/")}`);
  if (!pass) {
    console.error(JSON.stringify({ signalChecks, apertureChecks, proveChecks }, null, 2));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
