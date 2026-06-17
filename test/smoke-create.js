const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const packageJson = require("../package.json");

const rootDir = path.resolve(__dirname, "..");
const cliPath = path.join(rootDir, packageJson.bin["create-typescript-express"]);
const smokeRootDir = path.join(rootDir, ".tmp");
const smokeCases = [
	{
		name: "default app",
		targetDir: path.join(smokeRootDir, "smoke-app"),
		createArgs: ["--yes", "--skip-install"],
		installArgs: ["ci"],
		checks: [["npm", ["run", "check"]]],
		start: true
	},
	{
		name: "full feature app",
		targetDir: path.join(smokeRootDir, "smoke-app-features"),
		createArgs: [
			"--yes",
			"--features",
			"security,validation,openapi,prisma,auth",
			"--skip-install"
		],
		installArgs: ["install"],
		checks: [
			["npm", ["run", "check"]],
			["npm", ["audit", "--omit", "dev"]]
		]
	},
	{
		name: "no views app",
		targetDir: path.join(smokeRootDir, "smoke-app-no-views"),
		createArgs: ["--yes", "--no-views", "--skip-install"],
		installArgs: ["install"],
		checks: [["npm", ["run", "build"]]]
	},
	{
		name: "plain feature app",
		targetDir: path.join(smokeRootDir, "smoke-app-plain-features"),
		createArgs: [
			"--yes",
			"--features",
			"validation,openapi",
			"--no-import-alias",
			"--skip-install"
		],
		installArgs: ["install"],
		checks: [["npm", ["run", "build"]]]
	}
];

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd || rootDir,
		encoding: "utf8",
		stdio: "inherit"
	});

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(" ")} failed`);
	}
}

function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		});
	});
}

async function waitForHealth(port) {
	const url = `http://127.0.0.1:${port}/health`;
	const deadline = Date.now() + 30000;
	let lastError;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			const body = await response.json();

			if (
				response.status === 200 &&
				body.status === "ok" &&
				body.service === "typescript-express-app"
			) {
				return;
			}

			lastError = new Error(`Unexpected health response: ${response.status}`);
		} catch (error) {
			lastError = error;
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw lastError || new Error(`Timed out waiting for ${url}`);
}

function stopProcess(child) {
	return new Promise((resolve) => {
		if (child.exitCode !== null || child.signalCode !== null) {
			resolve();
			return;
		}

		const timeout = setTimeout(() => {
			child.kill("SIGKILL");
		}, 5000);

		child.once("exit", () => {
			clearTimeout(timeout);
			resolve();
		});

		child.kill("SIGTERM");
	});
}

async function main() {
	let serverProcess;

	try {
		for (const smokeCase of smokeCases) {
			fs.rmSync(smokeCase.targetDir, { recursive: true, force: true });
		}
		fs.mkdirSync(smokeRootDir, { recursive: true });

		for (const smokeCase of smokeCases) {
			console.log(`\nRunning smoke case: ${smokeCase.name}`);
			run(process.execPath, [cliPath, smokeCase.targetDir, ...smokeCase.createArgs]);
			run("npm", smokeCase.installArgs, { cwd: smokeCase.targetDir });

			for (const [command, args] of smokeCase.checks) {
				run(command, args, { cwd: smokeCase.targetDir });
			}

			if (smokeCase.start) {
				const port = await getFreePort();
				serverProcess = spawn("npm", ["run", "start"], {
					cwd: smokeCase.targetDir,
					env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
					stdio: "inherit"
				});

				await waitForHealth(port);
				await stopProcess(serverProcess);
				serverProcess = undefined;
			}
		}
	} finally {
		if (serverProcess) {
			await stopProcess(serverProcess);
		}

		for (const smokeCase of smokeCases) {
			fs.rmSync(smokeCase.targetDir, { recursive: true, force: true });
		}
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
