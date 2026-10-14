import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream";
import mongoose from "mongoose";
import cron from "node-cron";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// EJSON keeps ObjectIds and Dates intact inside a plain-text file
const { EJSON } = mongoose.mongo.BSON;

const FORMAT = "geo-shalmani-backup";
const VERSION = 1;
const FILE_RE =
  /^geo-shalmani-\d{8}-\d{6}-(auto|manual|prerestore|uploaded)\.json\.gz$/;
const BATCH = 500;

let busy = null; // "backup" | "restore" | null
const status = { lastAutoAt: null, lastAutoError: null };

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d = new Date()) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

// Only names we created are accepted, so a request can never reach another file
export function backupPath(name) {
  if (!FILE_RE.test(name || "")) throw new ApiError(400, "Invalid backup name");
  return path.join(env.backup.dir, name);
}

async function describe(name) {
  const stat = await fsp.stat(path.join(env.backup.dir, name));
  return {
    name,
    size: stat.size,
    createdAt: stat.mtime,
    type: FILE_RE.exec(name)[1],
  };
}

export async function listBackups() {
  await fsp.mkdir(env.backup.dir, { recursive: true });
  const names = (await fsp.readdir(env.backup.dir)).filter((f) =>
    FILE_RE.test(f),
  );
  const rows = await Promise.all(names.map(describe));
  return rows.sort((a, b) => b.name.localeCompare(a.name)); // newest first
}

// Reads a .json.gz file line by line (errors in the file make the loop throw)
async function* readLines(file) {
  const gunzip = zlib.createGunzip();
  gunzip.setEncoding("utf8");
  pipeline(fs.createReadStream(file), gunzip, () => {});

  let rest = "";
  for await (const chunk of gunzip) {
    rest += chunk;
    let i;
    while ((i = rest.indexOf("\n")) >= 0) {
      const line = rest.slice(0, i);
      rest = rest.slice(i + 1);
      if (line) yield line;
    }
  }
  if (rest) yield rest;
}

// Reads the whole file once to make sure it is a complete backup BEFORE anything is changed
async function verifyFile(file) {
  let meta = null;
  let end = null;
  try {
    for await (const line of readLines(file)) {
      const row = JSON.parse(line);
      if (row.t === "meta") meta = row;
      else if (row.t === "end") end = row;
    }
  } catch {
    throw new ApiError(400, "This file is damaged or is not a backup");
  }
  if (!meta || meta.format !== FORMAT || meta.version !== VERSION || !end) {
    throw new ApiError(
      400,
      "This backup is incomplete, damaged or from another application",
    );
  }
  return { createdAt: meta.createdAt, type: meta.type, counts: end.counts };
}

export async function getBackupInfo(name) {
  return verifyFile(backupPath(name));
}

async function collectionNames() {
  const cols = await mongoose.connection.db
    .listCollections({}, { nameOnly: true })
    .toArray();
  return cols
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();
}

// ---- create ---------------------------------------------------------------------
export async function createBackup(type = "manual") {
  if (busy) throw new ApiError(409, `A ${busy} is already running`);
  busy = "backup";

  await fsp.mkdir(env.backup.dir, { recursive: true });
  const name = `geo-shalmani-${stamp()}-${type}.json.gz`;
  const target = path.join(env.backup.dir, name);
  const tmp = `${target}.tmp`;

  try {
    const db = mongoose.connection.db;
    const names = await collectionNames();
    const counts = {};

    const gzip = zlib.createGzip();
    const out = fs.createWriteStream(tmp);
    gzip.pipe(out);
    const write = (line) =>
      new Promise((resolve, reject) =>
        gzip.write(`${line}\n`, (err) => (err ? reject(err) : resolve())),
      );

    await write(
      JSON.stringify({
        t: "meta",
        format: FORMAT,
        version: VERSION,
        createdAt: new Date().toISOString(),
        type,
        collections: names,
      }),
    );

    for (const col of names) {
      counts[col] = 0;
      for await (const doc of db.collection(col).find({})) {
        await write(
          JSON.stringify({
            c: col,
            d: EJSON.serialize(doc, { relaxed: false }),
          }),
        );
        counts[col] += 1;
      }
    }
    await write(JSON.stringify({ t: "end", counts }));

    await new Promise((resolve, reject) => {
      out.on("finish", resolve);
      out.on("error", reject);
      gzip.end();
    });
    await fsp.rename(tmp, target);
    await prune();
    return describe(name);
  } catch (err) {
    await fsp.unlink(tmp).catch(() => {});
    throw err;
  } finally {
    busy = null;
  }
}

// Keeps the newest N automatic backups (and 5 "before restore" copies). Manual ones are never auto-deleted.
async function prune() {
  const all = await listBackups();
  const drop = [
    ...all.filter((b) => b.type === "auto").slice(env.backup.keep),
    ...all.filter((b) => b.type === "prerestore").slice(5),
  ];
  await Promise.all(
    drop.map((b) =>
      fsp.unlink(path.join(env.backup.dir, b.name)).catch(() => {}),
    ),
  );
}

export async function deleteBackup(name) {
  const file = backupPath(name);
  await fsp.access(file).catch(() => {
    throw new ApiError(404, "Backup not found");
  });
  await fsp.unlink(file);
}

// An uploaded file is accepted only if it is a complete, valid backup
export async function importBackupFile(tmpPath) {
  await verifyFile(tmpPath);
  const name = `geo-shalmani-${stamp()}-uploaded.json.gz`;
  await fsp.rename(tmpPath, backupPath(name));
  return describe(name);
}

// ---- restore ----------------------------------------------------------------------
export async function restoreBackup(name) {
  const file = backupPath(name);
  await fsp.access(file).catch(() => {
    throw new ApiError(404, "Backup not found");
  });
  if (busy) throw new ApiError(409, `A ${busy} is already running`);

  await verifyFile(file); // nothing is touched if the file is bad
  const safety = await createBackup("prerestore"); // so the restore itself can be undone

  busy = "restore";
  try {
    const db = mongoose.connection.db;

    // 1. empty every collection (also ones that are not in the backup)
    for (const col of await collectionNames())
      await db.collection(col).deleteMany({});

    // 2. put the backup back, in batches
    const restored = {};
    const batches = new Map();
    const flush = async (col) => {
      const docs = batches.get(col);
      if (!docs?.length) return;
      await db.collection(col).insertMany(docs, { ordered: false });
      restored[col] = (restored[col] || 0) + docs.length;
      batches.set(col, []);
    };

    for await (const line of readLines(file)) {
      const row = JSON.parse(line);
      if (!row.c) continue; // meta / end lines
      if (!batches.has(row.c)) batches.set(row.c, []);
      batches.get(row.c).push(EJSON.deserialize(row.d));
      if (batches.get(row.c).length >= BATCH) await flush(row.c);
    }
    for (const col of batches.keys()) await flush(col);

    return {
      restored,
      total: Object.values(restored).reduce((s, n) => s + n, 0),
      safetyBackup: safety.name,
    };
  } finally {
    busy = null;
  }
}

// ---- schedule -----------------------------------------------------------------------
export function getBackupStatus() {
  return {
    ...status,
    auto: env.backup.auto,
    cron: env.backup.cron,
    tz: env.backup.tz,
    keep: env.backup.keep,
  };
}

async function runAutomatic() {
  try {
    await createBackup("auto");
    status.lastAutoAt = new Date();
    status.lastAutoError = null;
    console.log("🗄️  Automatic backup created");
  } catch (err) {
    status.lastAutoError = err.message;
    console.error("❌ Automatic backup failed:", err.message);
  }
}

export function startBackupScheduler() {
  if (!env.backup.auto)
    return console.log("ℹ️  Automatic backups are off (BACKUP_AUTO=false)");
  if (!cron.validate(env.backup.cron))
    return console.error(`❌ Invalid BACKUP_CRON: ${env.backup.cron}`);

  cron.schedule(env.backup.cron, runAutomatic, { timezone: env.backup.tz });
  console.log(
    `🗄️  Automatic backups: ${env.backup.cron} (${env.backup.tz}), keeping ${env.backup.keep}`,
  );

  // Hosts that go to sleep can miss the schedule: if the newest backup is old, make one shortly after start
  setTimeout(async () => {
    const [latest] = await listBackups().catch(() => []);
    if (
      !latest ||
      Date.now() - new Date(latest.createdAt).getTime() > 26 * 60 * 60 * 1000
    )
      runAutomatic();
  }, 30_000).unref();
}
