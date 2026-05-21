import { spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { log } from "../lib/logger";
import type { DumpResult, DbConnectionParams } from "./types";

function parseDatabaseUrl(url: string): DbConnectionParams {
  const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (!match) throw new Error("Invalid DATABASE_URL format — expected mysql://user:pass@host:port/db");
  return {
    user: match[1],
    password: decodeURIComponent(match[2]),
    host: match[3],
    port: match[4],
    database: match[5].split("?")[0],
  };
}

export async function dumpDatabase(): Promise<DumpResult> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");

  const config = parseDatabaseUrl(dbUrl);
  const backupDir = path.join(__dirname, "../../backups");
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${config.database}_${timestamp}.sql.gz`;
  const filePath = path.join(backupDir, fileName);
  const startTime = Date.now();

  log("info", `[Dumper] Starting dump → ${fileName}`);

  return new Promise((resolve, reject) => {
    const mysqldump = spawn("mysqldump", [
      `-h${config.host}`,
      `-P${config.port}`,
      `-u${config.user}`,
      `-p${config.password}`,
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      config.database,
    ]);

    const gzip = spawn("gzip");
    const output = fs.createWriteStream(filePath);

    mysqldump.stdout.pipe(gzip.stdin);
    gzip.stdout.pipe(output);

    const stderrChunks: Buffer[] = [];
    mysqldump.stderr.on("data", (data: Buffer) => stderrChunks.push(data));

    mysqldump.on("error", (err) => reject(new Error(`mysqldump spawn failed: ${err.message}`)));
    gzip.on("error", (err) => reject(new Error(`gzip spawn failed: ${err.message}`)));

    output.on("finish", () => {
      const stderr = Buffer.concat(stderrChunks).toString();
      // mysqldump writes warnings (not errors) to stderr — only fail on actual errors
      if (mysqldump.exitCode !== null && mysqldump.exitCode !== 0) {
        reject(new Error(`mysqldump exited ${mysqldump.exitCode}: ${stderr}`));
        return;
      }
      const stat = fs.statSync(filePath);
      if (stat.size === 0) {
        reject(new Error("Dump file is empty — mysqldump may have failed silently"));
        return;
      }
      const durationMs = Date.now() - startTime;
      log("info", `[Dumper] Done: ${fileName} (${Math.round(stat.size / 1024)}KB, ${durationMs}ms)`);
      resolve({ filePath, fileName, sizeBytes: stat.size, durationMs });
    });

    output.on("error", reject);
  });
}
