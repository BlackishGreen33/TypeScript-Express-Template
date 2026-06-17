const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const forbiddenPackagePaths = [
	/^\.tmp(?:\/|$)/,
	/^dist(?:\/|$)/,
	/^dist-cli\/.*\.map$/,
	/^node_modules(?:\/|$)/,
	/^template\/\.tmp(?:\/|$)/,
	/^template\/dist(?:\/|$)/,
	/^template\/node_modules(?:\/|$)/,
	/.*\.tgz$/
];

test("package tarball excludes generated and dependency artifacts", () => {
	const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
		encoding: "utf8"
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);

	const [packInfo] = JSON.parse(extractJsonArray(result.stdout));
	const paths = packInfo.files.map((file) => file.path);
	const forbiddenPath = paths.find((packagePath) =>
		forbiddenPackagePaths.some((pattern) => pattern.test(packagePath))
	);

	assert.equal(forbiddenPath, undefined);
	assert.ok(paths.includes("template/package.json"));
	assert.ok(paths.includes("dist-cli/create-typescript-express.mjs"));
});

function extractJsonArray(output) {
	const jsonStart = output.indexOf("[");
	const jsonEnd = output.lastIndexOf("]");

	assert.notEqual(jsonStart, -1, output);
	assert.notEqual(jsonEnd, -1, output);

	return output.slice(jsonStart, jsonEnd + 1);
}
