import type { DependencyMap, PackageJson } from "./types.mjs";

const packageShapeKeys = [
	"scripts",
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
	"overrides"
] as const;

export function sortObject(value: DependencyMap = {}): DependencyMap {
	return Object.fromEntries(
		Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
	);
}

export function addPackages(
	packageJson: PackageJson,
	section: "dependencies" | "devDependencies",
	packages: DependencyMap = {}
) {
	const current = packageJson[section] || {};
	packageJson[section] = sortObject({ ...current, ...packages });
}

export function removePackages(
	packageJson: PackageJson,
	section: "dependencies" | "devDependencies",
	packages: string[] = []
) {
	if (!packageJson[section]) {
		return;
	}

	for (const packageName of packages) {
		delete packageJson[section][packageName];
	}

	if (Object.keys(packageJson[section]).length === 0) {
		delete packageJson[section];
		return;
	}

	packageJson[section] = sortObject(packageJson[section]);
}

function packageShape(packageJson: PackageJson) {
	const shape: Record<string, unknown> = {};

	for (const key of packageShapeKeys) {
		shape[key] = packageJson[key] || {};
	}

	return JSON.stringify(shape);
}

export function hasInstallShapeChanged(before: PackageJson, after: PackageJson) {
	return packageShape(before) !== packageShape(after);
}
