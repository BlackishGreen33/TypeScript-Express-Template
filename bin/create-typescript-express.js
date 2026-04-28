#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const packageJson = require("../package.json");

const rootDir = path.resolve(__dirname, "..");
const templateDir = path.join(rootDir, "template");
const renameFiles = new Map([["_gitignore", ".gitignore"]]);
const ignoredTemplateEntries = new Set(["node_modules", "dist", ".tmp"]);

function printHelp() {
	console.log(`create-typescript-express ${packageJson.version}

Usage:
  npm create typescript-express@latest <project-name>
  npx create-typescript-express <project-name>

Options:
  -h, --help       Show this help message
  -v, --version    Show the package version`);
}

function toPackageName(name) {
	return name
		.trim()
		.toLowerCase()
		.replace(/^[._]+/, "")
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function isValidPackageName(name) {
	return /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name);
}

function assertUsableTarget(targetDir) {
	if (!fs.existsSync(targetDir)) {
		return;
	}

	const entries = fs.readdirSync(targetDir).filter((entry) => entry !== ".DS_Store");
	if (entries.length > 0) {
		throw new Error(`Target directory is not empty: ${targetDir}`);
	}
}

function copyTemplate(sourceDir, targetDir) {
	fs.mkdirSync(targetDir, { recursive: true });

	for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
		if (ignoredTemplateEntries.has(entry.name)) {
			continue;
		}

		const targetName = renameFiles.get(entry.name) || entry.name;
		const sourcePath = path.join(sourceDir, entry.name);
		const targetPath = path.join(targetDir, targetName);

		if (entry.isDirectory()) {
			copyTemplate(sourcePath, targetPath);
			continue;
		}

		fs.copyFileSync(sourcePath, targetPath);
	}
}

function updateGeneratedPackage(targetDir, packageName) {
	const packagePath = path.join(targetDir, "package.json");
	const generatedPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));

	generatedPackage.name = packageName;
	generatedPackage.version = "0.1.0";
	generatedPackage.private = true;

	fs.writeFileSync(packagePath, `${JSON.stringify(generatedPackage, null, "\t")}\n`);
}

function main(argv) {
	const [firstArg] = argv;

	if (!firstArg || firstArg === "-h" || firstArg === "--help") {
		printHelp();
		process.exit(firstArg ? 0 : 1);
	}

	if (firstArg === "-v" || firstArg === "--version") {
		console.log(packageJson.version);
		return;
	}

	const targetDir = path.resolve(process.cwd(), firstArg);
	const projectName = toPackageName(path.basename(targetDir));

	if (!projectName || !isValidPackageName(projectName)) {
		throw new Error(`Cannot derive a valid npm package name from "${firstArg}".`);
	}

	assertUsableTarget(targetDir);
	copyTemplate(templateDir, targetDir);
	updateGeneratedPackage(targetDir, projectName);

	const relativeTarget = path.relative(process.cwd(), targetDir) || ".";
	console.log(`Created ${projectName} in ${relativeTarget}`);
	console.log("");
	console.log("Next steps:");
	console.log(`  cd ${relativeTarget}`);
	console.log("  npm install");
	console.log("  npm run dev");
}

try {
	main(process.argv.slice(2));
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
