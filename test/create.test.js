const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const packageJson = require("../package.json");

const rootDir = path.resolve(__dirname, "..");
const cliPath = path.join(rootDir, packageJson.bin["create-typescript-express"]);

function runCli(args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd: rootDir,
		encoding: "utf8"
	});
}

function runCreate(target, args = []) {
	return runCli([target, "--yes", "--skip-install", ...args]);
}

test("prints help", () => {
	const result = runCli(["--help"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /create-typescript-express/);
	assert.match(result.stdout, /Usage: create-typescript-express/);
	assert.match(result.stdout, /--features <list>/);
	assert.match(result.stdout, /--skip-install/);
});

test("prints version", () => {
	const result = runCli(["--version"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.equal(result.stdout.trim(), packageJson.version);
});

test("requires a project name", () => {
	const result = runCli([]);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Non-interactive usage requires a project name and --yes/);
});

test("rejects invalid package names", () => {
	const result = runCreate("!!!");

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Cannot derive a valid npm package name/);
});

test("creates a project from the bundled template", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "my-api");

	const result = runCreate(targetDir);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Created my-api/);
	assert.ok(fs.existsSync(path.join(targetDir, ".gitignore")));
	assert.ok(!fs.existsSync(path.join(targetDir, "_gitignore")));
	assert.equal(fs.readFileSync(path.join(targetDir, ".nvmrc"), "utf8"), "24\n");
	assert.equal(fs.readFileSync(path.join(targetDir, ".node-version"), "utf8"), "24\n");
	assert.ok(fs.existsSync(path.join(targetDir, "README.md")));
	assert.ok(fs.existsSync(path.join(targetDir, "README.zh-TW.md")));
	assert.ok(fs.existsSync(path.join(targetDir, "README.zh-CN.md")));
	assert.match(fs.readFileSync(path.join(targetDir, "README.md"), "utf8"), /## Selected Options/);
	assert.match(fs.readFileSync(path.join(targetDir, "README.zh-TW.md"), "utf8"), /## 已選選項/);
	assert.match(fs.readFileSync(path.join(targetDir, "README.zh-CN.md"), "utf8"), /## 已选选项/);

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.name, "my-api");
	assert.equal(generatedPackage.version, "0.1.0");
	assert.equal(generatedPackage.private, true);
	assert.equal(generatedPackage.dependencies.express, "^5.2.1");
	assert.equal(generatedPackage.devDependencies["tsc-alias"], "^1.8.16");
	assert.equal(
		generatedPackage.scripts.build,
		"npm run ts-build && tsc-alias && npm run copy-static"
	);

	const generatedTsconfig = JSON.parse(
		fs.readFileSync(path.join(targetDir, "tsconfig.json"), "utf8")
	);
	assert.equal(generatedTsconfig.compilerOptions.baseUrl, ".");
	assert.deepEqual(generatedTsconfig.compilerOptions.paths, { "@/*": ["./*"] });
	assert.equal(generatedTsconfig.compilerOptions.ignoreDeprecations, "6.0");
	assert.match(fs.readFileSync(path.join(targetDir, "app.ts"), "utf8"), /from "@\/routes"/);

	const generatedLock = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package-lock.json"), "utf8")
	);
	assert.equal(generatedLock.name, "my-api");
	assert.equal(generatedLock.version, "0.1.0");
	assert.equal(generatedLock.packages[""].name, "my-api");
	assert.equal(generatedLock.packages[""].version, "0.1.0");

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("generates selected feature groups without a stale npm lockfile", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "full-api");

	const result = runCreate(targetDir, ["--features", "security,validation,openapi,prisma,auth"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /package-lock\.json was removed/);
	assert.ok(!fs.existsSync(path.join(targetDir, "package-lock.json")));

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.dependencies.helmet, "^8.1.0");
	assert.equal(generatedPackage.dependencies.zod, "^4.3.6");
	assert.equal(generatedPackage.dependencies["swagger-ui-express"], "^5.0.1");
	assert.equal(generatedPackage.dependencies["@prisma/adapter-better-sqlite3"], "^7.8.0");
	assert.equal(generatedPackage.dependencies["@prisma/client"], "^7.8.0");
	assert.equal(generatedPackage.dependencies.jose, "^6.2.3");
	assert.deepEqual(generatedPackage.overrides, { "@hono/node-server": "1.19.13" });
	assert.equal(generatedPackage.scripts.postinstall, "prisma generate");
	assert.equal(generatedPackage.scripts["prisma:generate"], "prisma generate");

	assert.ok(fs.existsSync(path.join(targetDir, "middleware/validateBody.ts")));
	assert.ok(fs.existsSync(path.join(targetDir, "middleware/auth.ts")));
	assert.ok(fs.existsSync(path.join(targetDir, "openapi.ts")));
	assert.ok(fs.existsSync(path.join(targetDir, "prisma.config.ts")));
	assert.ok(fs.existsSync(path.join(targetDir, "prisma/schema.prisma")));
	assert.match(
		fs.readFileSync(path.join(targetDir, ".prettierignore"), "utf8"),
		/generated\/prisma/
	);
	assert.match(
		fs.readFileSync(path.join(targetDir, "README.md"), "utf8"),
		/Optional features: security, validation, openapi, prisma, auth/
	);
	assert.match(
		fs.readFileSync(path.join(targetDir, "README.zh-TW.md"), "utf8"),
		/選用功能: security, validation, openapi, prisma, auth/
	);
	assert.match(
		fs.readFileSync(path.join(targetDir, "README.zh-CN.md"), "utf8"),
		/可选功能: security, validation, openapi, prisma, auth/
	);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("allows complete non-interactive flags without --yes", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "flag-api");

	const result = runCli([
		targetDir,
		"--features",
		"none",
		"--import-alias",
		"~/*",
		"--use-npm",
		"--skip-install"
	]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Created flag-api/);

	const generatedTsconfig = JSON.parse(
		fs.readFileSync(path.join(targetDir, "tsconfig.json"), "utf8")
	);
	assert.deepEqual(generatedTsconfig.compilerOptions.paths, { "~/*": ["./*"] });
	assert.match(fs.readFileSync(path.join(targetDir, "app.ts"), "utf8"), /from "~\/routes"/);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("deduplicates repeated feature flags", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "dedupe-api");

	const result = runCreate(targetDir, ["--features", "validation,validation,openapi"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(
		fs.readFileSync(path.join(targetDir, "README.md"), "utf8"),
		/Optional features: validation, openapi/
	);

	const routes = fs.readFileSync(path.join(targetDir, "routes/index.ts"), "utf8");
	assert.equal(routes.match(/path: "\/echo"/g).length, 1);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("rejects unknown feature flags", () => {
	const result = runCreate("unknown-feature-api", ["--features", "validation,queues"]);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Unknown feature option: queues/);
});

test("rejects conflicting package manager flags", () => {
	const result = runCli([
		"manager-api",
		"--features",
		"none",
		"--import-alias",
		"@/*",
		"--use-npm",
		"--use-pnpm",
		"--skip-install"
	]);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Choose only one package manager flag/);
});

test("rejects invalid import aliases", () => {
	const result = runCreate("bad-alias-api", ["--import-alias", "@"]);

	assert.equal(result.status, 1);
	assert.match(result.stderr, /Import alias must end with \/\*/);
});

test("can remove built-in template pieces and disable import alias", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "minimal-api");

	const result = runCreate(targetDir, [
		"--no-views",
		"--no-logging",
		"--no-cookies",
		"--no-dotenv",
		"--no-import-alias"
	]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(!fs.existsSync(path.join(targetDir, "views")));
	assert.ok(!fs.existsSync(path.join(targetDir, ".env.example")));
	assert.ok(!fs.existsSync(path.join(targetDir, "package-lock.json")));
	assert.doesNotMatch(fs.readFileSync(path.join(targetDir, "copyStatic.ts"), "utf8"), /"views"/);

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.dependencies.pug, undefined);
	assert.equal(generatedPackage.dependencies.morgan, undefined);
	assert.equal(generatedPackage.dependencies["cookie-parser"], undefined);
	assert.equal(generatedPackage.dependencies.dotenv, undefined);
	assert.equal(generatedPackage.devDependencies["tsc-alias"], undefined);
	assert.equal(generatedPackage.devDependencies["@types/debug"], undefined);
	assert.equal(generatedPackage.scripts.build, "npm run ts-build && npm run copy-static");

	const generatedTsconfig = JSON.parse(
		fs.readFileSync(path.join(targetDir, "tsconfig.json"), "utf8")
	);
	assert.equal(generatedTsconfig.compilerOptions.baseUrl, undefined);
	assert.equal(generatedTsconfig.compilerOptions.paths, undefined);
	assert.equal(generatedTsconfig.compilerOptions.ignoreDeprecations, undefined);
	assert.match(
		fs.readFileSync(path.join(targetDir, "routes/index.ts"), "utf8"),
		/from "\.\.\/types"/
	);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("generates validation and openapi without import alias", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "plain-feature-api");

	const result = runCreate(targetDir, ["--features", "validation,openapi", "--no-import-alias"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.dependencies.zod, "^4.3.6");
	assert.equal(generatedPackage.dependencies["swagger-ui-express"], "^5.0.1");
	assert.equal(generatedPackage.devDependencies["tsc-alias"], undefined);

	const app = fs.readFileSync(path.join(targetDir, "app.ts"), "utf8");
	assert.match(app, /from "\.\/routes"/);
	assert.match(app, /from "\.\/openapi"/);
	assert.doesNotMatch(app, /@\//);

	const routes = fs.readFileSync(path.join(targetDir, "routes/index.ts"), "utf8");
	assert.match(routes, /from "\.\/handlers"/);
	assert.match(routes, /from "\.\.\/types"/);
	assert.match(routes, /from "\.\.\/middleware\/validateBody"/);
	assert.doesNotMatch(routes, /@\//);

	assert.match(
		fs.readFileSync(path.join(targetDir, "README.md"), "utf8"),
		/Import alias: `disabled`/
	);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("generates validation routes with JSON errors when views are disabled", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "json-validation-api");

	const result = runCreate(targetDir, ["--features", "validation", "--no-views"]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(!fs.existsSync(path.join(targetDir, "views")));

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.dependencies.pug, undefined);
	assert.equal(generatedPackage.dependencies.zod, "^4.3.6");

	const app = fs.readFileSync(path.join(targetDir, "app.ts"), "utf8");
	assert.match(app, /res\.status\(status\)\.json/);
	assert.doesNotMatch(app, /res\.render\("error"\)/);

	const appTest = fs.readFileSync(path.join(targetDir, "test/app.test.ts"), "utf8");
	assert.match(appTest, /POST \/echo validates the request body/);
	assert.match(appTest, /GET \/not-found returns a JSON 404/);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("generates auth helper while trimming logging cookies and dotenv", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "auth-lite-api");

	const result = runCreate(targetDir, [
		"--features",
		"auth",
		"--no-logging",
		"--no-cookies",
		"--no-dotenv"
	]);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.ok(fs.existsSync(path.join(targetDir, "middleware/auth.ts")));
	assert.ok(!fs.existsSync(path.join(targetDir, ".env.example")));

	const generatedPackage = JSON.parse(
		fs.readFileSync(path.join(targetDir, "package.json"), "utf8")
	);
	assert.equal(generatedPackage.dependencies.jose, "^6.2.3");
	assert.equal(generatedPackage.dependencies.debug, undefined);
	assert.equal(generatedPackage.dependencies.morgan, undefined);
	assert.equal(generatedPackage.dependencies["cookie-parser"], undefined);
	assert.equal(generatedPackage.dependencies.dotenv, undefined);

	const app = fs.readFileSync(path.join(targetDir, "app.ts"), "utf8");
	assert.doesNotMatch(app, /cookieParser|logger\("dev"\)/);

	const server = fs.readFileSync(path.join(targetDir, "bin/server.ts"), "utf8");
	assert.doesNotMatch(server, /dotenv|debug|server\.on\("listening"/);

	fs.rmSync(tempDir, { recursive: true, force: true });
});

test("allows a target directory containing only .DS_Store", () => {
	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-typescript-express-"));
	const targetDir = path.join(tempDir, "mac-empty");
	fs.mkdirSync(targetDir);
	fs.writeFileSync(path.join(targetDir, ".DS_Store"), "");

	const result = runCreate(targetDir);

	assert.equal(result.status, 0, result.stderr || result.stdout);
	assert.match(result.stdout, /Created mac-empty/);
	assert.ok(fs.existsSync(path.join(targetDir, "package.json")));

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
