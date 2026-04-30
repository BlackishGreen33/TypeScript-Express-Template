import fs from "node:fs";
import path from "node:path";

const ignoredTemplateEntries = new Set(["node_modules", "dist", ".tmp"]);
const renameFiles = new Map([["_gitignore", ".gitignore"]]);

export function assertUsableTarget(targetDir: string) {
	if (!fs.existsSync(targetDir)) {
		return;
	}

	const entries = fs.readdirSync(targetDir).filter((entry) => entry !== ".DS_Store");
	if (entries.length > 0) {
		throw new Error(`Target directory is not empty: ${targetDir}`);
	}
}

export function copyTemplate(sourceDir: string, targetDir: string) {
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

export function readJson<T>(filePath: string): T {
	return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

export function writeJson(filePath: string, data: unknown) {
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}

export function readText(filePath: string) {
	return fs.readFileSync(filePath, "utf8");
}

export function writeText(filePath: string, text: string) {
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, text);
}

export function removePath(targetDir: string, relativePath: string) {
	fs.rmSync(path.join(targetDir, relativePath), { recursive: true, force: true });
}

export function updateTextFile(filePath: string, updater: (text: string) => string) {
	const current = readText(filePath);
	const next = updater(current);

	if (next !== current) {
		writeText(filePath, next);
	}
}

export function copySnippet(
	snippetsDir: string,
	targetDir: string,
	snippetPath: string,
	outputPath: string,
	replacements: Record<string, string> = {}
) {
	let text = readText(path.join(snippetsDir, snippetPath));

	for (const [token, value] of Object.entries(replacements)) {
		text = text.replaceAll(token, value);
	}

	writeText(path.join(targetDir, outputPath), text);
}
