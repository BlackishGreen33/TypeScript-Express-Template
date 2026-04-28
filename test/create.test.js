const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.resolve(__dirname, "..");
const cliPath = path.join(rootDir, "bin/create-typescript-express.js");

function runCreate(target) {
	return spawnSync(process.execPath, [cliPath, target], {
		cwd: rootDir,
		encoding: "utf8"
	});
}

test("creates a project from the bundled template", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "my-api");

	const result = runCreate(targetDir);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Created my-api/);
	assert.ok(fs.existsSync(path.join(targetDir, ".gitignore")));
	assert.ok(!fs.existsSync(path.join(targetDir, "_gitignore")));
	assert.ok(fs.existsSync(path.join(targetDir, "README.md")));
	assert.ok(fs.existsSync(path.join(targetDir, "README.zh-TW.md")));
	assert.ok(fs.existsSync(path.join(targetDir, "README.zh-CN.md")));

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.name, "my-api");
	assert.equal(generatedPackage.version, "0.1.0");
	assert.equal(generatedPackage.private, true);
	assert.equal(generatedPackage.dependencies.express, "^5.2.1");

	const generatedLock = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package-lock.json"), "utf8")
	);
	assert.equal(generatedLock.name, "my-api");
	assert.equal(generatedLock.version, "0.1.0");
	assert.equal(generatedLock.packages[""].name, "my-api");
	assert.equal(generatedLock.packages[""].version, "0.1.0");

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("refuses to overwrite a non-empty target directory", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "occupied");
	fs.mkdirSync(targetDir);
	fs.writeFileSync(path.join(targetDir, "README.md"), "existing\n");

	const result = runCreate(targetDir);

	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Target directory is not empty/);

	fs.rmSync(tempDir, { recursive: true, force: true });
});
