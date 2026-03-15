import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { spawn } from "node:child_process";
import { buildArtifactBundle, uiIndexPath } from "./build-artifact-bundle.mjs";

function getOpenCommand(targetPath) {
  if (process.platform === "darwin") {
    return { command: "open", args: [targetPath] };
  }

  if (process.platform === "win32") {
    return {
      command: "cmd",
      args: ["/c", "start", "", targetPath],
    };
  }

  return { command: "xdg-open", args: [targetPath] };
}

async function ensureIndexExists() {
  await access(uiIndexPath, fsConstants.F_OK);
}

async function main() {
  const printOnly = process.argv.includes("--print-only");
  const skipBuild = process.argv.includes("--no-build");

  if (!skipBuild) {
    await buildArtifactBundle();
  }

  await ensureIndexExists();

  if (printOnly) {
    console.log(uiIndexPath);
    return;
  }

  const { command, args } = getOpenCommand(uiIndexPath);
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  child.on("error", (error) => {
    console.error(`Failed to open Artifact Desk: ${error.message}`);
    process.exitCode = 1;
  });

  child.unref();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
