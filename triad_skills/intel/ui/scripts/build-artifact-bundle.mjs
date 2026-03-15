import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uiRoot = path.resolve(__dirname, "..");
export const intelRoot = path.resolve(uiRoot, "..");
export const outDir = path.join(uiRoot, "data");
export const uiIndexPath = path.join(uiRoot, "index.html");

function toPosix(value) {
  return value.split(path.sep).join("/");
}

async function safeReadJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function resolveDateKey(baseDir, preferredDateKey) {
  if (preferredDateKey) {
    try {
      const stats = await fs.stat(path.join(baseDir, preferredDateKey));
      if (stats.isDirectory()) {
        return preferredDateKey;
      }
    } catch {
      // Fall through to latest dir lookup.
    }
  }

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const datedDirs = entries
      .filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    return datedDirs[0] ?? null;
  } catch {
    return null;
  }
}

async function resolveDateFile(baseDir, preferredDateKey) {
  if (preferredDateKey) {
    const filePath = path.join(baseDir, `${preferredDateKey}.json`);
    try {
      await fs.stat(filePath);
      return preferredDateKey;
    } catch {
      // Fall through to latest file lookup.
    }
  }

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });
    const datedFiles = entries
      .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}\.json$/.test(entry.name))
      .map((entry) => entry.name.replace(/\.json$/, ""))
      .sort((left, right) => right.localeCompare(left));

    return datedFiles[0] ?? null;
  } catch {
    return null;
  }
}

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(?:Thesis\s+\|\s+)?(.+)$/m);
  return match?.[1]?.trim() || fallback;
}

async function buildAnalysisEntries(analysisDateKey, analysisIndex) {
  if (!analysisDateKey) {
    return [];
  }

  const analysisDir = path.join(intelRoot, "analysis", analysisDateKey);
  const prioritizedPaths = Array.isArray(analysisIndex)
    ? analysisIndex
        .map((item) => item?.notePath)
        .filter((notePath) => typeof notePath === "string" && notePath.endsWith(".md"))
    : [];

  const fallbackEntries = await fs.readdir(analysisDir, { withFileTypes: true });
  const fallbackPaths = fallbackEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => toPosix(path.join("intel", "analysis", analysisDateKey, entry.name)));

  const notePaths = [...new Set([...prioritizedPaths, ...fallbackPaths])];
  const entries = [];

  for (const notePath of notePaths) {
    const relativePath = notePath.replace(/^intel\//, "");
    const filePath = path.join(intelRoot, relativePath);
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, "utf8");
    const fileName = path.basename(filePath);
    const matchedIndex = Array.isArray(analysisIndex)
      ? analysisIndex.find((item) => item.notePath === notePath)
      : null;

    entries.push({
      id: relativePath,
      fileName,
      relativePath: `intel/${relativePath}`,
      title: matchedIndex?.title ?? extractTitle(content, fileName),
      route: matchedIndex?.route ?? fileName.split("__")[0] ?? "analysis",
      thesisId: matchedIndex?.thesisId ?? null,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      modifiedAt: stats.mtime.toISOString(),
      content,
      type: "markdown",
      category: "analysis",
    });
  }

  return entries;
}

async function buildTradePlanEntries(dateKey) {
  if (!dateKey) {
    return [];
  }

  const plansPath = path.join(intelRoot, "trade-plans", dateKey, "plans.json");
  const plans = await safeReadJson(plansPath);

  if (!Array.isArray(plans) || plans.length === 0) {
    return [];
  }

  return plans.map((plan) => ({
    id: `trade-plans/${dateKey}/${plan.planId}`,
    fileName: `${plan.planId}.json`,
    relativePath: `intel/trade-plans/${dateKey}/${plan.planId}.json`,
    title: `${plan.direction?.toUpperCase() ?? "WATCH"} ${plan.instrument}`,
    route: plan.setup ?? "watch",
    thesisId: plan.thesisId ?? null,
    planId: plan.planId,
    instrument: plan.instrument,
    direction: plan.direction,
    status: plan.status,
    confidence: plan.confidence,
    entryTrigger: plan.entryTrigger,
    stopLoss: plan.stopLoss,
    targetZone: plan.targetZone,
    invalidation: plan.invalidation,
    content: JSON.stringify(plan, null, 2),
    type: "json",
    category: "trade-plan",
  }));
}

async function buildRiskReviewEntries(dateKey) {
  if (!dateKey) {
    return [];
  }

  const reviewsPath = path.join(intelRoot, "risk", dateKey, "reviews.json");
  const reviews = await safeReadJson(reviewsPath);

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return [];
  }

  return reviews.map((review) => ({
    id: `risk/${dateKey}/${review.reviewId}`,
    fileName: `${review.reviewId}.json`,
    relativePath: `intel/risk/${dateKey}/${review.reviewId}.json`,
    title: `${review.decision?.toUpperCase() ?? "PENDING"} ${review.instrument}`,
    route: review.decision ?? "pending",
    planId: review.planId,
    reviewId: review.reviewId,
    instrument: review.instrument,
    decision: review.decision,
    vetoReasons: review.vetoReasons,
    note: review.note,
    content: JSON.stringify(review, null, 2),
    type: "json",
    category: "risk-review",
  }));
}

function buildSummary(currentRun, analysisDateKey, analysisEntries, tradePlanEntries, riskReviewEntries) {
  const approved = riskReviewEntries.filter((r) => r.decision === "approved").length;
  const watch = riskReviewEntries.filter((r) => r.decision === "watch").length;
  const rejected = riskReviewEntries.filter((r) => r.decision === "rejected").length;

  return {
    runId: currentRun?.currentRunId ?? null,
    analysisDate: analysisDateKey,
    updatedAt: currentRun?.updatedAt ?? null,
    analysisCount: analysisEntries.length,
    tradePlanCount: tradePlanEntries.length,
    riskReviewCount: riskReviewEntries.length,
    decisions: { approved, watch, rejected },
    fileCount: analysisEntries.length + tradePlanEntries.length + riskReviewEntries.length,
  };
}

function buildBundleJs(bundle) {
  return `window.TRIAD_ARTIFACT_BUNDLE = ${JSON.stringify(bundle, null, 2)};\n`;
}

export async function buildArtifactBundle() {
  await fs.mkdir(outDir, { recursive: true });

  const currentRun = await safeReadJson(path.join(intelRoot, "state", "current-run.json"));
  const preferredDateKey = currentRun?.updatedAt?.slice(0, 10) ?? null;
  const analysisDateKey = await resolveDateKey(path.join(intelRoot, "analysis"), preferredDateKey);
  const tradePlanDateKey = await resolveDateKey(path.join(intelRoot, "trade-plans"), preferredDateKey);
  const riskDateKey = await resolveDateKey(path.join(intelRoot, "risk"), preferredDateKey);
  const analysisIndex = analysisDateKey
    ? await safeReadJson(path.join(intelRoot, "analysis", analysisDateKey, "index.json"))
    : null;

  const analysisEntries = await buildAnalysisEntries(analysisDateKey, analysisIndex);
  const tradePlanEntries = await buildTradePlanEntries(tradePlanDateKey);
  const riskReviewEntries = await buildRiskReviewEntries(riskDateKey);

  const bundle = {
    generatedAt: new Date().toISOString(),
    summary: buildSummary(currentRun, analysisDateKey, analysisEntries, tradePlanEntries, riskReviewEntries),
    entries: analysisEntries,
    tradePlans: tradePlanEntries,
    riskReviews: riskReviewEntries,
  };

  const jsonPath = path.join(outDir, "artifact-bundle.json");
  const jsPath = path.join(outDir, "artifact-bundle.js");
  await fs.writeFile(jsonPath, `${JSON.stringify(bundle, null, 2)}\n`);
  await fs.writeFile(jsPath, buildBundleJs(bundle));

  return {
    bundle,
    jsonPath,
    jsPath,
    uiIndexPath,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  buildArtifactBundle().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
