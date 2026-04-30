const fs = require("node:fs");
const path = require("node:path");

const ignoredTemplateEntries = new Set(["node_modules", "dist", ".tmp"]);
const renameFiles = new Map([["_gitignore", ".gitignore"]]);

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

function readJson(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}

function readText(filePath) {
	return fs.readFileSync(filePath, "utf8");
}

function writeText(filePath, text) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, text);
}

function removePath(targetDir, relativePath) {
	fs.rmSync(path.join(targetDir, relativePath), { recursive: true, force: true });
}

function updateTextFile(filePath, updater) {
	const current = readText(filePath);
	const next = updater(current);

	if (next !== current) {
		writeText(filePath, next);
	}
}

function copySnippet(snippetsDir, targetDir, snippetPath, outputPath, replacements = {}) {
	let text = readText(path.join(snippetsDir, snippetPath));

	for (const [token, value] of Object.entries(replacements)) {
		text = text.replaceAll(token, value);
	}

	writeText(path.join(targetDir, outputPath), text);
}

module.exports = {
	assertUsableTarget,
	copySnippet,
	copyTemplate,
	readJson,
	readText,
	removePath,
	updateTextFile,
	writeJson,
	writeText
};
