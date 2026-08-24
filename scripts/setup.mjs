import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const workspaceRoot = resolve(projectRoot, "..");

const dependencies = [
  {
    name: "smart-travel-shared-types",
    url: "https://github.com/Likitha-Kattamudi-31/smart-travel-shared-types.git",
  },
  {
    name: "smart-travel-shared-state",
    url: "https://github.com/Likitha-Kattamudi-31/smart-travel-shared-state.git",
  },
];

function run(command, args, cwd) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  if (process.platform === "win32" && command === "pnpm") {
    const result = spawnSync(
      process.env.ComSpec || "cmd.exe",
      ["/d", "/s", "/c", "pnpm", ...args],
      {
        cwd,
        stdio: "inherit",
        shell: false,
      }
    );

    if (result.error) throw result.error;

    if (result.status !== 0) {
      throw new Error(
        `pnpm ${args.join(" ")} failed with exit code ${result.status}`
      );
    }

    return;
  }

  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) throw result.error;

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}`
    );
  }
}

console.log("\n========================================");
console.log("Smart Travel Weather MFE Setup");
console.log("========================================");

for (const dependency of dependencies) {
  const dependencyPath = resolve(workspaceRoot, dependency.name);

  if (existsSync(dependencyPath)) {
    console.log(`Skipping ${dependency.name}; directory already exists.`);
    continue;
  }

  console.log(`\nCloning ${dependency.name}...`);

  run(
    "git",
    ["clone", dependency.url, dependencyPath],
    workspaceRoot
  );
}

const sharedTypesPath = resolve(
  workspaceRoot,
  "smart-travel-shared-types"
);

console.log("\nInstalling shared-types...");
run("pnpm", ["install"], sharedTypesPath);

console.log("\nBuilding shared-types...");
run("pnpm", ["build"], sharedTypesPath);

const sharedStatePath = resolve(
  workspaceRoot,
  "smart-travel-shared-state"
);

console.log("\nInstalling shared-state...");
run("pnpm", ["install"], sharedStatePath);

console.log("\nBuilding shared-state...");
run("pnpm", ["build"], sharedStatePath);

console.log("\nInstalling Weather MFE dependencies...");
run("pnpm", ["install"], projectRoot);

console.log("\n========================================");
console.log("Weather MFE setup complete!");
console.log("========================================");

console.log("\nRun:");
console.log("pnpm run dev");