const { spawnSync } = require("node:child_process");
const path = require("node:path");

const { DEFAULT_IMPORT_ALIAS, featureDefinitions, togglePackages } = require("./constants");
const {
	assertUsableTarget,
	copySnippet,
	copyTemplate,
	readJson,
	removePath,
	updateTextFile,
	writeJson
} = require("./filesystem");
const { addPackages, hasInstallShapeChanged, removePackages } = require("./package-json");

const rootDir = path.resolve(__dirname, "../..");
const templateDir = path.join(rootDir, "template");
const snippetsDir = path.join(rootDir, "bin/snippets");

function createProject(config, lifecycle = {}) {
	const targetDir = path.resolve(process.cwd(), config.projectPath);
	const projectName = toPackageName(path.basename(targetDir));

	if (!projectName || !isValidPackageName(projectName)) {
		throw new Error(`Cannot derive a valid npm package name from "${config.projectPath}".`);
	}

	assertUsableTarget(targetDir);
	copyTemplate(templateDir, targetDir);

	const templatePackage = readJson(path.join(templateDir, "package.json"));
	const generatedPackage = readJson(path.join(targetDir, "package.json"));

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

function updateGeneratedPackageLock(targetDir, packageName) {
	const lockPath = path.join(targetDir, "package-lock.json");
	const generatedLock = readJson(lockPath);

	generatedLock.name = packageName;
	generatedLock.version = "0.1.0";

	if (generatedLock.packages && generatedLock.packages[""]) {
		generatedLock.packages[""].name = packageName;
		generatedLock.packages[""].version = "0.1.0";
	}

	writeJson(lockPath, generatedLock);
}

function applyToggles(targetDir, packageJson, config) {
	for (const [toggle, packages] of Object.entries(togglePackages)) {
		if (config[toggle]) {
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

function applyFeatures(targetDir, packageJson, config) {
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

function applyAlias(targetDir, packageJson, alias) {
	const tsconfigPath = path.join(targetDir, "tsconfig.json");
	const tsconfig = readJson(tsconfigPath);

	if (alias === false) {
		delete tsconfig.compilerOptions.baseUrl;
		delete tsconfig.compilerOptions.paths;
		delete tsconfig.compilerOptions.ignoreDeprecations;
		packageJson.scripts.build = "npm run ts-build && npm run copy-static";
		removePackages(packageJson, "devDependencies", ["tsc-alias"]);
		replaceDefaultAliasImports(targetDir, {
			"@/app": "../app",
			"@/routes/handlers": "./handlers",
			"@/routes": "./routes",
			"@/types": "../types",
			"@/middleware/validateBody": "../middleware/validateBody",
			"@/openapi": "./openapi"
		});
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
		replaceDefaultAliasImports(targetDir, { "@/": prefix });
	}

	writeTsconfig(tsconfigPath, tsconfig);
}

function writeTsconfig(tsconfigPath, tsconfig) {
	writeJson(tsconfigPath, tsconfig);
	updateTextFile(tsconfigPath, (text) =>
		text
			.replace(/\[\n\s+"([^"]+)"\n\s+\]/g, '["$1"]')
			.replace(/\[\n\s+"([^"]+)",\n\s+"([^"]+)"\n\s+\]/g, '["$1", "$2"]')
	);
}

function aliasToPrefix(alias) {
	return alias.replace(/\*$/, "");
}

function replaceDefaultAliasImports(targetDir, replacements) {
	const files = [
		"app.ts",
		"bin/server.ts",
		"routes/index.ts",
		"middleware/auth.ts",
		"middleware/validateBody.ts",
		"routes/handlers/modules/echo.ts"
	];

	for (const file of files) {
		const filePath = path.join(targetDir, file);
		try {
			updateTextFile(filePath, (text) => {
				let next = text;
				for (const [from, to] of Object.entries(replacements)) {
					next = next.replaceAll(from, to);
				}
				return next;
			});
		} catch (error) {
			if (error.code !== "ENOENT") {
				throw error;
			}
		}
	}
}

function disableViews(targetDir) {
	removePath(targetDir, "views");
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		text
			.replace(
				'app.set("views", path.join(__dirname, "views"));\napp.set("view engine", "pug");\n\n',
				""
			)
			.replace(
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
			)
	);
	updateTextFile(path.join(targetDir, "test/app.test.js"), (text) =>
		text.replace(
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

function disableLogging(targetDir) {
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

function disableCookies(targetDir) {
	updateTextFile(path.join(targetDir, "app.ts"), (text) =>
		text
			.replace('import cookieParser from "cookie-parser";\n', "")
			.replace("app.use(cookieParser());\n", "")
	);
}

function disableDotenv(targetDir) {
	removePath(targetDir, ".env.example");
	updateTextFile(path.join(targetDir, "bin/server.ts"), (text) =>
		text
			.replace('import * as dotenv from "dotenv";\n\n', "")
			.replace("dotenv.config();\n\n", "")
	);
}

function addSecurity(targetDir) {
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

function addValidation(targetDir) {
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
	updateTextFile(path.join(targetDir, "test/app.test.js"), (text) =>
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

function addOpenApi(targetDir) {
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
	updateTextFile(path.join(targetDir, "test/app.test.js"), (text) =>
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

function addPrisma(targetDir, packageJson) {
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

function addAuth(targetDir) {
	copySnippet(snippetsDir, targetDir, "auth/auth.ts", "middleware/auth.ts");
}

function insertAfter(text, marker, addition) {
	if (text.includes(addition.trim())) {
		return text;
	}

	if (!text.includes(marker)) {
		throw new Error(`Could not find insertion marker: ${marker.trim()}`);
	}

	return text.replace(marker, `${marker}${addition}`);
}

function insertRoute(text, routeText) {
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

function writeSelectedOptions(targetDir, config) {
	const featureText = config.features.length > 0 ? config.features.join(", ") : "none";
	const aliasText = config.importAlias === false ? "disabled" : config.importAlias;
	const section = `## Selected Options

- Import alias: \`${aliasText}\`
- Optional features: ${featureText}

`;

	updateTextFile(path.join(targetDir, "README.md"), (text) => {
		if (text.includes("## Selected Options")) {
			return text;
		}

		return text.replace("## Getting Started\n", `${section}## Getting Started\n`);
	});
}

function appendIgnoreEntry(targetDir, fileName, entry) {
	updateTextFile(path.join(targetDir, fileName), (text) => {
		if (text.split(/\r?\n/).includes(entry)) {
			return text;
		}

		return text.endsWith("\n") ? `${text}${entry}\n` : `${text}\n${entry}\n`;
	});
}

function installDependencies(targetDir, packageManager, lifecycle) {
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

module.exports = {
	createProject,
	isValidPackageName,
	toPackageName
};
