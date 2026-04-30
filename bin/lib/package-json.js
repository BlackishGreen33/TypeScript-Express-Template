const packageShapeKeys = [
	"scripts",
	"dependencies",
	"devDependencies",
	"optionalDependencies",
	"peerDependencies",
	"overrides"
];

function sortObject(value) {
	return Object.fromEntries(
		Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right))
	);
}

function addPackages(packageJson, section, packages = {}) {
	const current = packageJson[section] || {};
	packageJson[section] = sortObject({ ...current, ...packages });
}

function removePackages(packageJson, section, packages = []) {
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

function packageShape(packageJson) {
	const shape = {};

	for (const key of packageShapeKeys) {
		shape[key] = packageJson[key] || {};
	}

	return JSON.stringify(shape);
}

function hasInstallShapeChanged(before, after) {
	return packageShape(before) !== packageShape(after);
}

module.exports = {
	addPackages,
	hasInstallShapeChanged,
	removePackages,
	sortObject
};
