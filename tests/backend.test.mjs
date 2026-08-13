import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const port = 39099;
const testDir = path.resolve("/tmp/hall-booking-test");
const dbFile = path.join(testDir, `app-${process.pid}.db`);
fs.mkdirSync(testDir, { recursive: true });

const server = spawn(process.execPath, ["server.js"], {
	cwd: path.resolve("backend"),
	env: {
		...process.env,
		PORT: String(port),
		NODE_ENV: "test",
		JWT_SECRET: "test-secret",
		USER_INVITE_CODE: "user-code",
		ADMIN_INVITE_CODE: "admin-code",
		CORS_ORIGIN: "*",
		APP_TIME_ZONE: "UTC",
		DB_FILE: dbFile,
	},
	stdio: ["ignore", "pipe", "pipe"],
});

async function waitForServer() {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const ready = await new Promise((resolve) => {
			const socket = net.connect(port, "127.0.0.1");
			socket.once("connect", () => { socket.destroy(); resolve(true); });
			socket.once("error", () => resolve(false));
		});
		if (ready) return;
		await new Promise((resolve) => setTimeout(resolve, 50));
	}
	throw new Error("Backend did not start");
}

try {
	await waitForServer();
	const health = await fetch(`http://127.0.0.1:${port}/api/health`);
	assert.equal(health.status, 200);
	assert.deepEqual(await health.json(), { ok: true, timeZone: "UTC" });
	assert.equal(health.headers.get("x-powered-by"), null);
	assert.equal(health.headers.get("x-content-type-options"), "nosniff");

	const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ name: "Test User", password: "safe-password", code: "user-code" }),
	});
	assert.equal(login.status, 200);
	const { token, user } = await login.json();
	assert.equal(user.role, "user");
	assert.ok(token);

	const me = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
		headers: { authorization: `Bearer ${token}` },
	});
	assert.equal(me.status, 200);
	assert.equal((await me.json()).user.name, "Test User");
	console.log("Backend smoke tests passed");
} finally {
	server.kill("SIGTERM");
	fs.rmSync(dbFile, { force: true });
}
