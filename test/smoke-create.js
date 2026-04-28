const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const targetDir = path.join(rootDir, ".tmp", "smoke-app");

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd || rootDir,
		encoding: "utf8",
		stdio: "inherit"
	});

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetDir), { recursive: true });

run(process.execPath, [path.join(rootDir, "bin/create-typescript-express.js"), targetDir]);
run("npm", ["ci"], { cwd: targetDir });
run("npm", ["run", "check"], { cwd: targetDir });

fs.rmSync(targetDir, { recursive: true, force: true });
