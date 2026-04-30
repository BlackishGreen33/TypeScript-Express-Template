const { Command } = require("commander");
const pc = require("picocolors");

const packageJson = require("../../package.json");
const { supportedFeatures } = require("./constants");
const { createProject } = require("./generator");
const { resolveConfig } = require("./prompts");

async function main(argv) {
	const program = new Command();

	program
		.name("create-typescript-express")
		.description("Create a lightweight Express 5 application with TypeScript.")
		.version(packageJson.version, "-v, --version", "Show the package version")
		.argument("[project-name]", "Project directory to create")
		.option("-y, --yes", "Use recommended defaults without prompts")
		.option("--import-alias <alias>", "Configure a TypeScript import alias, for example @/*")
		.option("--no-import-alias", "Skip TypeScript import alias configuration")
		.option(
			"--features <list>",
			`Comma-separated optional features: ${supportedFeatures.join(", ")}`
		)
		.option("--no-views", "Skip Pug views and render JSON errors")
		.option("--no-logging", "Skip request logging dependencies")
		.option("--no-cookies", "Skip cookie-parser")
		.option("--no-dotenv", "Skip dotenv loading")
		.option("--no-docker", "Skip Dockerfile and .dockerignore")
		.option("--no-ci", "Skip GitHub Actions CI")
		.option("--use-npm", "Install dependencies with npm")
		.option("--use-pnpm", "Install dependencies with pnpm")
		.option("--use-yarn", "Install dependencies with Yarn")
		.option("--use-bun", "Install dependencies with Bun")
		.option("--skip-install", "Create files without installing dependencies")
		.addHelpText(
			"after",
			`

Examples:
  npm create typescript-express@latest my-api
  npm create typescript-express@latest my-api -- --yes
  npm create typescript-express@latest my-api -- --features security,validation --use-pnpm`
		);

	program.parse(argv, { from: "user" });

	const config = await resolveConfig(program.args[0], program.opts(), { argv });
	const prompts = await maybeLoadPrompts();
	let spinner;

	const result = createProject(config, {
		onInstallStart(packageManager) {
			if (prompts) {
				spinner = prompts.spinner();
				spinner.start(`Installing dependencies with ${packageManager}`);
			}
		},
		onInstallEnd() {
			spinner?.stop("Dependencies installed");
		}
	});

	printSuccess(result, config);
}

async function maybeLoadPrompts() {
	if (!process.stdout.isTTY) {
		return undefined;
	}

	return import("@clack/prompts");
}

function printSuccess(result, config) {
	const cdCommand = result.relativeTarget === "." ? "" : `  cd ${result.relativeTarget}\n`;
	const installCommand = config.install ? "" : `  ${installCommandFor(config.packageManager)}\n`;
	const featureText = config.features.length > 0 ? config.features.join(", ") : "none";
	const aliasText = config.importAlias === false ? "disabled" : config.importAlias;

	console.log("");
	console.log(pc.green(`Created ${result.projectName} in ${result.relativeTarget}`));
	console.log("");
	console.log(pc.bold("Selected options:"));
	console.log(`  import alias: ${aliasText}`);
	console.log(`  optional features: ${featureText}`);
	console.log(`  package manager: ${config.packageManager}`);
	console.log("");

	if (result.lockfileRemoved) {
		console.log(
			pc.yellow("package-lock.json was removed because the generated dependency set changed.")
		);
		console.log("");
	}

	console.log(pc.bold("Next steps:"));
	console.log(`${cdCommand}${installCommand}  ${config.packageManager} run dev`);
}

function installCommandFor(packageManager) {
	if (packageManager === "npm") {
		return "npm install";
	}

	return `${packageManager} install`;
}

module.exports = {
	main
};
