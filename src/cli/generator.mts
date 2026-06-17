import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_IMPORT_ALIAS, featureDefinitions, togglePackages } from "./constants.mjs";
import {
	assertUsableTarget,
	copySnippet,
	copyTemplate,
	readJson,
	removePath,
	updateTextFile,
	writeJson
} from "./filesystem.mjs";
import { addPackages, hasInstallShapeChanged, removePackages } from "./package-json.mjs";
import type { CreateConfig, CreateResult, GeneratorLifecycle, PackageJson } from "./types.mjs";

interface TsConfig {
	compilerOptions: {
		baseUrl?: string;
		paths?: Record<string, string[]>;
		ignoreDeprecations?: string;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

type TextReplacement = readonly [searchValue: string, replacement: string];

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir =
	path.basename(runtimeDir) === "dist-cli"
		? path.resolve(runtimeDir, "..")
		: path.resolve(runtimeDir, "../..");
const templateDir = path.join(rootDir, "template");
const snippetsDir = path.join(rootDir, "bin/snippets");
const aliasImportFiles = [
	"app.ts",
	"bin/server.ts",
	"routes/index.ts",
	"middleware/auth.ts",
	"middleware/validateBody.ts",
	"routes/handlers/modules/echo.ts"
];
const noAliasImportReplacements: Record<string, string> = {
	"@/app": "../app",
	"@/routes/handlers": "./handlers",
	"@/routes": "./routes",
	"@/types": "../types",
	"@/middleware/validateBody": "../middleware/validateBody",
	"@/openapi": "./openapi"
};

export function createProject(
	config: CreateConfig,
	lifecycle: GeneratorLifecycle = {}
): CreateResult {
	const targetDir = path.resolve(process.cwd(), config.projectPath);
	const projectName = toPackageName(path.basename(targetDir));

	if (!projectName || !isValidPackageName(projectName)) {
		throw new Error(`Cannot derive a valid npm package name from "${config.projectPath}".`);
	}

	assertUsableTarget(targetDir);
	copyTemplate(templateDir, targetDir);

	const templatePackage = readJson<PackageJson>(path.join(templateDir, "package.json"));
	const generatedPackage = readJson<PackageJson>(path.join(targetDir, "package.json"));

	generatedPackage.name = projectName;
	generatedPackage.version = "0.1.0";
	generatedPackage.private = true;

	applyToggles(targetDir, generatedPackage, config);
	applyFeatures(targetDir, generatedPackage, config);
	applyAlias(targetDir, generatedPackage, config.importAlias);
	writeSelectedOptions(targetDir, config);

	writeJson(path.join(targetDir, "package.json"), generatedPackage);

	const installShapeChanged = hasInstallShapeChanged(templatePackage, generatedPackage);
	if (installShapeChanged && (!config.install || config.packageManager !== "npm")) {
		removePath(targetDir, "package-lock.json");
	} else {
		updateGeneratedPackageLock(targetDir, projectName);
	}

	if (config.install) {
		installDependencies(targetDir, config.packageManager, lifecycle);
	}

	return {
		projectName,
		targetDir,
		relativeTarget: path.relative(process.cwd(), targetDir) || ".",
		lockfileRemoved: installShapeChanged && (!config.install || config.packageManager !== "npm")
	};
}

export function toPackageName(name: string) {
	return name
		.trim()
		.toLowerCase()
		.replace(/^[._]+/, "")
		.replace(/[^a-z0-9._-]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function isValidPackageName(name: string) {
	return /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name);
}

function updateGeneratedPackageLock(targetDir: string, packageName: string) {
	const lockPath = path.join(targetDir, "package-lock.json");
	const generatedLock = readJson<PackageJson>(lockPath);

	generatedLock.name = packageName;
	generatedLock.version = "0.1.0";

	const packages = generatedLock.packages;
	if (isPackageLockPackages(packages) && packages[""]) {
		packages[""].name = packageName;
		packages[""].version = "0.1.0";
	}

	writeJson(lockPath, generatedLock);
}

function isPackageLockPackages(value: unknown): value is Record<string, PackageJson> {
	return typeof value === "object" && value !== null;
}

function applyToggles(targetDir: string, packageJson: PackageJson, config: CreateConfig) {
	for (const [toggle, packages] of Object.entries(togglePackages)) {
		if (config[toggle as keyof typeof togglePackages]) {
			continue;
		}

		removePackages(packageJson, "dependencies", packages.dependencies);
		removePackages(packageJson, "devDependencies", packages.devDependencies);
	}

	if (!config.views) {
		disableViews(targetDir);
	}

	if (!config.logging) {
		disableLogging(targetDir);
	}

	if (!config.cookies) {
		disableCookies(targetDir);
	}

	if (!config.dotenv) {
		disableDotenv(targetDir);
	}

	if (!config.docker) {
		removePath(targetDir, "Dockerfile");
		removePath(targetDir, ".dockerignore");
	}

	if (!config.ci) {
		removePath(targetDir, ".github");
	}
}

function applyFeatures(targetDir: string, packageJson: PackageJson, config: CreateConfig) {
	for (const featureName of config.features) {
		const feature = featureDefinitions[featureName];
		addPackages(packageJson, "dependencies", feature.dependencies);
		addPackages(packageJson, "devDependencies", feature.devDependencies);
	}

	if (config.features.includes("security")) {
		addSecurity(targetDir);
	}

	if (config.features.includes("validation")) {
		addValidation(targetDir);
	}

	if (config.features.includes("openapi")) {
		addOpenApi(targetDir);
	}

	if (config.features.includes("prisma")) {
		addPrisma(targetDir, packageJson);
	}

	if (config.features.includes("auth")) {
		addAuth(targetDir);
	}
}

function applyAlias(targetDir: string, packageJson: PackageJson, alias: string | false) {
	const tsconfigPath = path.join(targetDir, "tsconfig.json");
	const tsconfig = readJson<TsConfig>(tsconfigPath);

	if (alias === false) {
		delete tsconfig.compilerOptions.baseUrl;
		delete tsconfig.compilerOptions.paths;
		delete tsconfig.compilerOptions.ignoreDeprecations;
		packageJson.scripts.build = "npm run ts-build && npm run copy-static";
		removePackages(packageJson, "devDependencies", ["tsc-alias"]);
		replaceDefaultAliasImports(targetDir, noAliasImportReplacements);
		writeTsconfig(tsconfigPath, tsconfig);
		return;
	}

	tsconfig.compilerOptions.baseUrl = ".";
	tsconfig.compilerOptions.paths = {
		[alias || DEFAULT_IMPORT_ALIAS]: ["./*"]
	};
	tsconfig.compilerOptions.ignoreDeprecations = "6.0";
	addPackages(packageJson, "devDependencies", { "tsc-alias": "^1.8.16" });
	packageJson.scripts.build = "npm run ts-build && tsc-alias && npm run copy-static";

	if (alias && alias !== DEFAULT_IMPORT_ALIAS) {
		const prefix = aliasToPrefix(alias);
		replaceDefaultAliasImports(targetDir, createCustomAliasReplacements(prefix));
	}

	writeTsconfig(tsconfigPath, tsconfig);
}

function writeTsconfig(tsconfigPath: string, tsconfig: TsConfig) {
	writeJson(tsconfigPath, tsconfig);
	updateTextFile(tsconfigPath, (text) =>
		text
			.replace(/\[\n\s+"([^"]+)"\n\s+\]/g, '["$1"]')
			.replace(/\[\n\s+"([^"]+)",\n\s+"([^"]+)"\n\s+\]/g, '["$1", "$2"]')
	);
}

function aliasToPrefix(alias: string) {
	return alias.replace(/\*$/, "");
}

function createCustomAliasReplacements(prefix: string): Record<string, string> {
	return { "@/": prefix };
}

function replaceDefaultAliasImports(targetDir: string, replacements: Record<string, string>) {
	updateOptionalTextFiles(targetDir, aliasImportFiles, (text) => {
		let next = text;
		for (const [from, to] of Object.entries(replacements)) {
			next = next.replaceAll(from, to);
		}
		return next;
	});
}

function updateOptionalTextFiles(
	targetDir: string,
	files: string[],
	updater: (text: string) => string
) {
	for (const file of files) {
		try {
			updateTextFile(path.join(targetDir, file), updater);
		} catch (error) {
			if (isMissingFile(error)) {
				continue;
			}

			throw error;
		}
	}
}

function isMissingFile(error: unknown) {
	return isNodeError(error) && error.code === "ENOENT";
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error;
}

function disableViews(targetDir: string) {
	removePath(targetDir, "views");
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		replaceRequiredAll(text, [
			[
				'app.set("views", path.join(__dirname, "views"));\napp.set("view engine", "pug");\n\n',
				""
			],
			[
				`app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
\tconst status = err.status || 500;

\tres.locals.message = err.message;
\tres.locals.status = status;
\tres.locals.error = req.app.get("env") === "development" ? err : {};

\tres.status(status);
\tres.render("error");
});
`,
				`app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
\tconst status = err.status || 500;

\tres.status(status).json({
\t\tmessage: err.message,
\t\tstatus
\t});
});
`
			]
		])
	);
	updateTextFile(path.join(targetDir, "copyStatic.ts"), (text) =>
		replaceRequired(text, 'cpSync("views", "dist/views", { recursive: true });\n', "")
	);
	updateTextFile(path.join(targetDir, "test/app.test.ts"), (text) =>
		replaceRequired(
			text,
			`test("GET /not-found uses the app error view without a stack trace", async () => {
\tconst response = await request(app).get("/not-found").expect(404);

\tassert.match(response.text, /<h1>Not Found<\\/h1>/);
\tassert.match(response.text, /<h2>404<\\/h2>/);
\tassert.doesNotMatch(response.text, /NotFoundError|app\\.ts|node_modules/);
});
`,
			`test("GET /not-found returns a JSON 404", async () => {
\tconst response = await request(app).get("/not-found").expect(404);

\tassert.equal(response.body.message, "Not Found");
\tassert.equal(response.body.status, 404);
});
`
		)
	);
}

function disableLogging(targetDir: string) {
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		text.replace('import logger from "morgan";\n', "").replace('app.use(logger("dev"));\n', "")
	);
	updateTextFile(path.join(targetDir, "bin/server.ts"), (text) =>
		text
			.replace('import debug from "debug";\n', "")
			.replace(
				`
function onListening() {
\tconst addr = server.address();
\tconst bind = typeof addr === "string" ? "pipe " + addr : "port " + addr!.port;
\tdebug("typescript-express:server")("Listening on " + bind);
}
`,
				""
			)
			.replace('server.on("listening", onListening);\n', "")
	);
}

function disableCookies(targetDir: string) {
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		text
			.replace('import cookieParser from "cookie-parser";\n', "")
			.replace("app.use(cookieParser());\n", "")
	);
}

function disableDotenv(targetDir: string) {
	removePath(targetDir, ".env.example");
	updateTextFile(path.join(targetDir, "bin/server.ts"), (text) =>
		text
			.replace('import * as dotenv from "dotenv";\n\n', "")
			.replace("dotenv.config();\n\n", "")
	);
}

function addSecurity(targetDir: string) {
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		insertAfter(
			text.replace(
				'import express, { Application, Request, Response, NextFunction } from "express";\n',
				'import express, { Application, Request, Response, NextFunction } from "express";\nimport compression from "compression";\nimport cors from "cors";\nimport { rateLimit } from "express-rate-limit";\nimport helmet from "helmet";\n'
			),
			"const app: Application = express();\n",
			`
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(
\trateLimit({
\t\twindowMs: 60_000,
\t\tlimit: 100
\t})
);
`
		)
	);
}

function addValidation(targetDir: string) {
	copySnippet(snippetsDir, targetDir, "validation/validateBody.ts", "middleware/validateBody.ts");
	copySnippet(snippetsDir, targetDir, "validation/echo.ts", "routes/handlers/modules/echo.ts");
	updateTextFile(path.join(targetDir, "routes/handlers/index.ts"), (text) =>
		insertAfter(
			text,
			'export { home } from "./modules/home";\n',
			'export { echo, echoSchema } from "./modules/echo";\n'
		)
	);
	updateTextFile(path.join(targetDir, "routes/index.ts"), (text) =>
		insertRoute(
			insertAfter(
				text.replace(
					'import { health, home } from "@/routes/handlers";',
					'import { echo, echoSchema, health, home } from "@/routes/handlers";'
				),
				'import { RouteType } from "@/types";\n',
				'import { validateBody } from "@/middleware/validateBody";\n'
			),
			`{
\t\tmethod: "post",
\t\tpath: "/echo",
\t\tmiddleware: [validateBody(echoSchema)],
\t\thandler: echo
\t}`
		)
	);
	updateTextFile(path.join(targetDir, "test/app.test.ts"), (text) =>
		insertAfter(
			text,
			`test("GET /health returns a JSON health response", async () => {
\tconst response = await request(app).get("/health").expect(200);

\tassert.equal(response.body.status, "ok");
\tassert.equal(response.body.service, "typescript-express-app");
});
`,
			`
test("POST /echo validates the request body", async () => {
\tawait request(app).post("/echo").send({ message: "" }).expect(400);

\tconst response = await request(app).post("/echo").send({ message: "hello" }).expect(201);
\tassert.equal(response.body.message, "hello");
});
`
		)
	);
}

function addOpenApi(targetDir: string) {
	copySnippet(snippetsDir, targetDir, "openapi/openapi.ts", "openapi.ts");
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		insertAfter(
			text
				.replace(
					'import express, { Application, Request, Response, NextFunction } from "express";\n',
					'import express, { Application, Request, Response, NextFunction } from "express";\nimport swaggerUi from "swagger-ui-express";\n'
				)
				.replace(
					'import routers from "@/routes";\n',
					'import routers from "@/routes";\nimport { openApiDocument } from "@/openapi";\n'
				),
			'app.use(express.static(path.join(__dirname, "public")));\n',
			`
app.get("/openapi.json", (_req, res) => {
\tres.json(openApiDocument);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
`
		)
	);
	updateTextFile(path.join(targetDir, "test/app.test.ts"), (text) =>
		insertAfter(
			text,
			`test("GET /health returns a JSON health response", async () => {
\tconst response = await request(app).get("/health").expect(200);

\tassert.equal(response.body.status, "ok");
\tassert.equal(response.body.service, "typescript-express-app");
});
`,
			`
test("GET /openapi.json returns the generated OpenAPI document", async () => {
\tconst response = await request(app).get("/openapi.json").expect(200);

\tassert.equal(response.body.openapi, "3.1.0");
\tassert.equal(response.body.info.title, "TypeScript Express API");
});
`
		)
	);
}

function addPrisma(targetDir: string, packageJson: PackageJson) {
	copySnippet(snippetsDir, targetDir, "prisma/schema.prisma", "prisma/schema.prisma");
	copySnippet(snippetsDir, targetDir, "prisma/prisma.ts", "lib/prisma.ts");
	copySnippet(snippetsDir, targetDir, "prisma/prisma.config.ts", "prisma.config.ts");
	appendIgnoreEntry(targetDir, ".prettierignore", "generated/prisma");
	appendIgnoreEntry(targetDir, ".gitignore", "generated/prisma");
	packageJson.overrides = {
		...(packageJson.overrides || {}),
		"@hono/node-server": "1.19.13"
	};
	packageJson.scripts.postinstall = "prisma generate";
	packageJson.scripts["prisma:generate"] = "prisma generate";
	packageJson.scripts["prisma:migrate"] = "prisma migrate dev";
}

function addAuth(targetDir: string) {
	copySnippet(snippetsDir, targetDir, "auth/auth.ts", "middleware/auth.ts");
}

function insertAfter(text: string, marker: string, addition: string) {
	if (text.includes(addition.trim())) {
		return text;
	}

	if (!text.includes(marker)) {
		throw new Error(`Could not find insertion marker: ${marker.trim()}`);
	}

	return text.replace(marker, `${marker}${addition}`);
}

function replaceRequired(text: string, searchValue: string, replacement: string) {
	if (!text.includes(searchValue)) {
		throw new Error(`Could not find replacement marker: ${searchValue.trim()}`);
	}

	return text.replace(searchValue, replacement);
}

function replaceRequiredAll(text: string, replacements: TextReplacement[]) {
	return replacements.reduce(
		(next, [searchValue, replacement]) => replaceRequired(next, searchValue, replacement),
		text
	);
}

function insertRoute(text: string, routeText: string) {
	if (text.includes('path: "/echo"')) {
		return text;
	}

	return text.replace(
		`{
\t\tmethod: "get",
\t\tpath: "/health",
\t\tmiddleware: [],
\t\thandler: health
\t}`,
		`{
\t\tmethod: "get",
\t\tpath: "/health",
\t\tmiddleware: [],
\t\thandler: health
\t},
\t${routeText}`
	);
}

function writeSelectedOptions(targetDir: string, config: CreateConfig) {
	const readmes = [
		{
			fileName: "README.md",
			heading: "## Selected Options",
			anchor: "## Getting Started\n",
			aliasLabel: "Import alias",
			featuresLabel: "Optional features",
			disabledText: "disabled",
			noneText: "none"
		},
		{
			fileName: "README.zh-TW.md",
			heading: "## 已選選項",
			anchor: "## 開始使用\n",
			aliasLabel: "Import alias",
			featuresLabel: "選用功能",
			disabledText: "停用",
			noneText: "無"
		},
		{
			fileName: "README.zh-CN.md",
			heading: "## 已选选项",
			anchor: "## 开始使用\n",
			aliasLabel: "Import alias",
			featuresLabel: "可选功能",
			disabledText: "已禁用",
			noneText: "无"
		}
	];

	for (const readme of readmes) {
		const featureText =
			config.features.length > 0 ? config.features.join(", ") : readme.noneText;
		const aliasText = config.importAlias === false ? readme.disabledText : config.importAlias;
		const section = `${readme.heading}

- ${readme.aliasLabel}: \`${aliasText}\`
- ${readme.featuresLabel}: ${featureText}

`;

		updateTextFile(path.join(targetDir, readme.fileName), (text) => {
			if (text.includes(readme.heading)) {
				return text;
			}

			if (!text.includes(readme.anchor)) {
				throw new Error(`Could not find README insertion marker: ${readme.anchor.trim()}`);
			}

			return text.replace(readme.anchor, `${section}${readme.anchor}`);
		});
	}
}

function appendIgnoreEntry(targetDir: string, fileName: string, entry: string) {
	updateTextFile(path.join(targetDir, fileName), (text) => {
		if (text.split(/\r?\n/).includes(entry)) {
			return text;
		}

		return text.endsWith("\n") ? `${text}${entry}\n` : `${text}\n${entry}\n`;
	});
}

function installDependencies(
	targetDir: string,
	packageManager: CreateConfig["packageManager"],
	lifecycle: GeneratorLifecycle
) {
	const command = packageManager;
	const args = packageManager === "yarn" ? ["install"] : ["install"];
	lifecycle.onInstallStart?.(packageManager);

	const result = spawnSync(command, args, {
		cwd: targetDir,
		stdio: "inherit"
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}

	lifecycle.onInstallEnd?.();
}
