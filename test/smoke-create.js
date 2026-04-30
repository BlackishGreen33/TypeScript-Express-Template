const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const targetDir = path.join(rootDir, ".tmp", "smoke-app");
const featureTargetDir = path.join(rootDir, ".tmp", "smoke-app-features");

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
		fs.rmSync(targetDir, { recursive: true, force: true });
		fs.rmSync(featureTargetDir, { recursive: true, force: true });
		fs.mkdirSync(path.dirname(targetDir), { recursive: true });

		run(process.execPath, [
			path.join(rootDir, "bin/create-typescript-express.js"),
			targetDir,
			"--yes",
			"--skip-install"
		]);
		run("npm", ["ci"], { cwd: targetDir });
		run("npm", ["run", "check"], { cwd: targetDir });

		const port = await getFreePort();
		serverProcess = spawn("npm", ["run", "start"], {
			cwd: targetDir,
			env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
			stdio: "inherit"
		});

		await waitForHealth(port);

		run(process.execPath, [
			path.join(rootDir, "bin/create-typescript-express.js"),
			featureTargetDir,
			"--yes",
			"--features",
			"security,validation,openapi,prisma,auth",
			"--skip-install"
		]);
		run("npm", ["install"], { cwd: featureTargetDir });
		run("npm", ["run", "check"], { cwd: featureTargetDir });
	} finally {
		if (serverProcess) {
			await stopProcess(serverProcess);
		}

		fs.rmSync(targetDir, { recursive: true, force: true });
		fs.rmSync(featureTargetDir, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
