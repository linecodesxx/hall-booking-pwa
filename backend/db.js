import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "app.db");

let database;
let SQL;

function persist() {
	fs.writeFileSync(dbPath, Buffer.from(database.export()));
}

function normalizeParams(params) {
	return params.map((value) => (value === undefined ? null : value));
}

export const db = {
	prepare(sql) {
		return {
			all(...params) {
				const stmt = database.prepare(sql);
				stmt.bind(normalizeParams(params));
				const rows = [];
				while (stmt.step()) rows.push(stmt.getAsObject());
				stmt.free();
				return rows;
			},
			get(...params) {
				const stmt = database.prepare(sql);
				stmt.bind(normalizeParams(params));
				const row = stmt.step() ? stmt.getAsObject() : undefined;
				stmt.free();
				return row;
			},
			run(...params) {
				database.run(sql, normalizeParams(params));
				const result = {
					lastInsertRowid: Number(
						database.exec("SELECT last_insert_rowid() AS id")[0]
							?.values[0]?.[0] || 0,
					),
				};
				persist();
				return result;
			},
		};
	},
	exec(sql) {
		database.exec(sql);
		persist();
	},
};

export async function initDb() {
	SQL = await initSqlJs();
	database = fs.existsSync(dbPath)
		? new SQL.Database(fs.readFileSync(dbPath))
		: new SQL.Database();
	db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      color TEXT,
      password_hash TEXT,
      password_salt TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS halls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      hall_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      comment TEXT,
      admin_comment TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (hall_id) REFERENCES halls(id)
    );
  `);

	const userColumns = db
		.prepare("PRAGMA table_info(users)")
		.all()
		.map((column) => column.name);
	if (!userColumns.includes("color")) {
		db.exec("ALTER TABLE users ADD COLUMN color TEXT");
	}
	if (!userColumns.includes("password_hash")) {
		db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
	}
	if (!userColumns.includes("password_salt")) {
		db.exec("ALTER TABLE users ADD COLUMN password_salt TEXT");
	}

	const hallColumns = db
		.prepare("PRAGMA table_info(halls)")
		.all()
		.map((column) => column.name);
	if (!hallColumns.includes("color")) {
		db.exec("ALTER TABLE halls ADD COLUMN color TEXT");
	}

	const count = db.prepare("SELECT COUNT(*) AS count FROM halls").get().count;
	if (!count) {
		const insert = db.prepare(
			"INSERT INTO halls (name, description, color) VALUES (?, ?, ?)",
		);
		[
			["Большой зал", "Основной зал на 150 человек", "#2563eb"],
			["Малый зал", "Камерное пространство для встреч", "#20a36b"],
			["Переговорная", "Комната для рабочих созвонов и совещаний", "#f59e0b"],
		].forEach((hall) => insert.run(...hall));
	} else {
		const palette = [
			"#2563eb",
			"#20a36b",
			"#f59e0b",
			"#e11d48",
			"#7c3aed",
			"#0f766e",
			"#ea580c",
			"#0891b2",
		];
		db.prepare(
			"SELECT id FROM halls WHERE color IS NULL OR color = '' ORDER BY id",
		)
			.all()
			.forEach((hall, index) => {
				db.prepare("UPDATE halls SET color = ? WHERE id = ?").run(
					palette[index % palette.length],
					hall.id,
				);
			});
	}
}

export function findApprovedConflict({
	hall_id,
	date,
	start_time,
	end_time,
	excludeId,
}) {
	return db
		.prepare(`
    SELECT b.*, h.name AS hall_name, u.name AS user_name
    FROM bookings b
    JOIN halls h ON h.id = b.hall_id
    JOIN users u ON u.id = b.user_id
    WHERE b.hall_id = ?
      AND b.date = ?
      AND b.status = 'approved'
      AND (? < b.end_time AND ? > b.start_time)
      AND (? IS NULL OR b.id != ?)
    ORDER BY b.start_time
  `)
		.all(
			hall_id,
			date,
			start_time,
			end_time,
			excludeId ?? null,
			excludeId ?? null,
		);
}

export function findPendingOverlap({
	hall_id,
	date,
	start_time,
	end_time,
	excludeId,
}) {
	return db
		.prepare(`
    SELECT b.*, h.name AS hall_name, u.name AS user_name
    FROM bookings b
    JOIN halls h ON h.id = b.hall_id
    JOIN users u ON u.id = b.user_id
    WHERE b.hall_id = ?
      AND b.date = ?
      AND b.status = 'pending'
      AND (? < b.end_time AND ? > b.start_time)
      AND (? IS NULL OR b.id != ?)
    ORDER BY b.start_time
  `)
		.all(
			hall_id,
			date,
			start_time,
			end_time,
			excludeId ?? null,
			excludeId ?? null,
		);
}
