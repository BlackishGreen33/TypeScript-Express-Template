export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
export type FeatureName = "security" | "validation" | "openapi" | "prisma" | "auth";
export type TemplateToggle = "views" | "logging" | "cookies" | "dotenv";

export type DependencyMap = Record<string, string>;

export interface FeatureDefinition {
	label: string;
	hint: string;
	dependencies?: DependencyMap;
	devDependencies?: DependencyMap;
}

export interface TogglePackages {
	dependencies?: string[];
	devDependencies?: string[];
}

export interface PackageJson {
	name?: string;
	version?: string;
	private?: boolean;
	scripts: Record<string, string>;
	dependencies?: DependencyMap;
	devDependencies?: DependencyMap;
	optionalDependencies?: DependencyMap;
	peerDependencies?: DependencyMap;
	overrides?: Record<string, string>;
	[key: string]: unknown;
}

export interface CreateConfig {
	projectPath: string;
	importAlias: string | false;
	features: FeatureName[];
	views: boolean;
	logging: boolean;
	cookies: boolean;
	dotenv: boolean;
	docker: boolean;
	ci: boolean;
	install: boolean;
	packageManager: PackageManager;
	yes: boolean;
}

export type CreateConfigDraft = Omit<CreateConfig, "projectPath"> & {
	projectPath?: string;
};

export interface GeneratorLifecycle {
	onInstallStart?: (packageManager: PackageManager) => void;
	onInstallEnd?: () => void;
}

export interface CreateResult {
	projectName: string;
	targetDir: string;
	relativeTarget: string;
	lockfileRemoved: boolean;
}

export interface PromptOptions {
	importAlias?: string | false;
	features?: string;
	views?: boolean;
	logging?: boolean;
	cookies?: boolean;
	dotenv?: boolean;
	docker?: boolean;
	ci?: boolean;
	skipInstall?: boolean;
	useNpm?: boolean;
	usePnpm?: boolean;
	useYarn?: boolean;
	useBun?: boolean;
	yes?: boolean;
}
