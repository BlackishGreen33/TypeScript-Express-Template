import pc from "picocolors";

import {
	DEFAULT_IMPORT_ALIAS,
	featureDefinitions,
	supportedPackageManagers
} from "./constants.mjs";
import type {
	CreateConfig,
	CreateConfigDraft,
	FeatureName,
	PackageManager,
	PromptOptions
} from "./types.mjs";

type Prompts = typeof import("@clack/prompts");

const packageManagerOptionKeys: Record<PackageManager, keyof PromptOptions> = {
	npm: "useNpm",
	pnpm: "usePnpm",
	yarn: "useYarn",
	bun: "useBun"
};

export function detectPackageManager(): PackageManager {
	const userAgent = process.env.npm_config_user_agent || "";
	const [name] = userAgent.split("/");

	if (supportedPackageManagers.includes(name as PackageManager)) {
		return name as PackageManager;
	}

	return "npm";
}

function parsePackageManager(options: PromptOptions): PackageManager {
	const selected = supportedPackageManagers.filter(
		(manager) => options[packageManagerOptionKeys[manager]]
	);

	if (selected.length > 1) {
		throw new Error("Choose only one package manager flag.");
	}

	return selected[0] || detectPackageManager();
}

function parseFeatures(value: string | undefined): FeatureName[] {
	if (!value) {
		return [];
	}

	if (value.trim() === "none") {
		return [];
	}

	const features = value
		.split(",")
		.map((feature) => feature.trim())
		.filter(Boolean);
	const unknown = features.filter((feature) => !isFeatureName(feature));

	if (unknown.length > 0) {
		throw new Error(`Unknown feature option: ${unknown.join(", ")}`);
	}

	return [...new Set(features)] as FeatureName[];
}

function isFeatureName(value: string): value is FeatureName {
	return Object.hasOwn(featureDefinitions, value);
}

export function validateImportAlias(alias: string | false | undefined): string | false {
	if (alias === false) {
		return false;
	}

	if (!alias || typeof alias !== "string") {
		return DEFAULT_IMPORT_ALIAS;
	}

	if (!/^[~@#a-zA-Z0-9._/-]+\/\*$/.test(alias)) {
		throw new Error(`Import alias must end with /*, for example ${DEFAULT_IMPORT_ALIAS}.`);
	}

	return alias;
}

function createBaseConfig(
	projectPath: string | undefined,
	options: PromptOptions
): CreateConfigDraft {
	return {
		projectPath,
		importAlias: validateImportAlias(options.importAlias),
		features: parseFeatures(options.features),
		views: options.views !== false,
		logging: options.logging !== false,
		cookies: options.cookies !== false,
		dotenv: options.dotenv !== false,
		docker: options.docker !== false,
		ci: options.ci !== false,
		install: options.skipInstall !== true,
		packageManager: parsePackageManager(options),
		yes: options.yes === true
	};
}

export async function resolveConfig(
	projectPath: string | undefined,
	options: PromptOptions,
	meta: { argv?: string[] } = {}
): Promise<CreateConfig> {
	const baseConfig = createBaseConfig(projectPath, options);
	const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

	if (baseConfig.yes || (!isInteractive && hasCompleteFlagConfig(projectPath, meta.argv || []))) {
		if (!baseConfig.projectPath) {
			throw new Error("Project name is required when using --yes.");
		}

		return requireProjectPath(baseConfig);
	}

	if (!isInteractive) {
		throw new Error(
			"Non-interactive usage requires a project name and --yes, or complete flags, for example: npm create typescript-express@latest my-api -- --yes"
		);
	}

	return promptForConfig(baseConfig);
}

function requireProjectPath(config: CreateConfigDraft): CreateConfig {
	if (!config.projectPath) {
		throw new Error("Project name is required.");
	}

	return { ...config, projectPath: config.projectPath };
}

function hasCompleteFlagConfig(projectPath: string | undefined, argv: string[]) {
	return (
		Boolean(projectPath) &&
		hasFlag(argv, "--features") &&
		(hasFlag(argv, "--import-alias") || hasFlag(argv, "--no-import-alias")) &&
		supportedPackageManagers.some((manager) => hasFlag(argv, `--use-${manager}`))
	);
}

function hasFlag(argv: string[], flag: string) {
	return argv.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

async function promptForConfig(config: CreateConfigDraft): Promise<CreateConfig> {
	const prompts = await import("@clack/prompts");

	prompts.intro(pc.bgCyan(pc.black(" create-typescript-express ")));

	let projectPath = config.projectPath;
	if (!projectPath) {
		const answer = await prompts.text({
			message: "What is your project named?",
			placeholder: "my-api",
			validate(value) {
				if (!value?.trim()) {
					return "Project name is required.";
				}
			}
		});

		if (prompts.isCancel(answer)) {
			cancel(prompts);
		}

		projectPath = answer;
	}

	const mode = await prompts.select({
		message: "Would you like to use the recommended defaults?",
		options: [
			{
				value: "recommended",
				label: "Yes, use recommended defaults",
				hint: "Express, TypeScript, ESLint, tests, Docker, CI, @/* alias"
			},
			{
				value: "custom",
				label: "No, customize settings",
				hint: "Choose alias, optional middleware, feature groups, and install behavior"
			}
		]
	});

	if (prompts.isCancel(mode)) {
		cancel(prompts);
	}

	if (mode === "recommended") {
		return { ...config, projectPath };
	}

	const importAlias = await promptImportAlias(prompts, config.importAlias);
	const toggles = await promptToggles(prompts, config);
	const features = await promptFeatures(prompts, config.features);
	const packageManager = await promptPackageManager(prompts, config.packageManager);
	const install = await promptInstall(prompts, config.install);

	return {
		...config,
		...toggles,
		projectPath,
		importAlias,
		features,
		packageManager,
		install
	};
}

async function promptImportAlias(
	prompts: Prompts,
	currentAlias: string | false
): Promise<string | false> {
	const customizeAlias = await prompts.confirm({
		message: "Would you like to customize the import alias?",
		initialValue: currentAlias !== DEFAULT_IMPORT_ALIAS
	});

	if (prompts.isCancel(customizeAlias)) {
		cancel(prompts);
	}

	if (!customizeAlias) {
		return currentAlias;
	}

	const alias = await prompts.text({
		message: "What import alias would you like configured?",
		initialValue: currentAlias || DEFAULT_IMPORT_ALIAS,
		validate(value) {
			try {
				validateImportAlias(value);
			} catch (error) {
				return error instanceof Error ? error.message : String(error);
			}
		}
	});

	if (prompts.isCancel(alias)) {
		cancel(prompts);
	}

	return validateImportAlias(alias);
}

async function promptToggles(prompts: Prompts, config: CreateConfigDraft) {
	const selected = await prompts.multiselect({
		message: "Which built-in template pieces would you like to include?",
		required: false,
		initialValues: [
			config.views && "views",
			config.logging && "logging",
			config.cookies && "cookies",
			config.dotenv && "dotenv",
			config.docker && "docker",
			config.ci && "ci"
		].filter(Boolean) as string[],
		options: [
			{ value: "views", label: "Pug views" },
			{ value: "logging", label: "Request logging" },
			{ value: "cookies", label: "Cookie parser" },
			{ value: "dotenv", label: ".env loading" },
			{ value: "docker", label: "Dockerfile" },
			{ value: "ci", label: "GitHub Actions CI" }
		]
	});

	if (prompts.isCancel(selected)) {
		cancel(prompts);
	}

	return {
		views: selected.includes("views"),
		logging: selected.includes("logging"),
		cookies: selected.includes("cookies"),
		dotenv: selected.includes("dotenv"),
		docker: selected.includes("docker"),
		ci: selected.includes("ci")
	};
}

async function promptFeatures(prompts: Prompts, currentFeatures: FeatureName[]) {
	const selected = await prompts.multiselect({
		message: "Which optional feature groups would you like to add?",
		required: false,
		initialValues: currentFeatures,
		options: Object.entries(featureDefinitions).map(([value, feature]) => ({
			value,
			label: feature.label,
			hint: feature.hint
		}))
	});

	if (prompts.isCancel(selected)) {
		cancel(prompts);
	}

	return selected as FeatureName[];
}

async function promptPackageManager(
	prompts: Prompts,
	currentPackageManager: PackageManager
): Promise<PackageManager> {
	const selected = await prompts.select({
		message: "Which package manager would you like to use?",
		initialValue: currentPackageManager,
		options: supportedPackageManagers.map((manager) => ({
			value: manager,
			label: manager
		}))
	});

	if (prompts.isCancel(selected)) {
		cancel(prompts);
	}

	return selected as PackageManager;
}

async function promptInstall(prompts: Prompts, currentInstall: boolean) {
	const install = await prompts.confirm({
		message: "Install dependencies now?",
		initialValue: currentInstall
	});

	if (prompts.isCancel(install)) {
		cancel(prompts);
	}

	return install;
}

function cancel(prompts: Prompts): never {
	prompts.cancel("Project creation cancelled.");
	process.exit(1);
	throw new Error("Project creation cancelled.");
}
