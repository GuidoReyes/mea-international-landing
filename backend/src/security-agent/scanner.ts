import fs from "fs";
import path from "path";
import { log } from "../lib/logger";
import type { FileChunk, FileMetadata } from "./types";

const INCLUDE_EXTENSIONS = new Set([".ts", ".js", ".json", ".example"]);
const EXCLUDE_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".security-scans", "backups"]);
const EXCLUDE_PATTERNS = [/\.test\.ts$/, /\.spec\.ts$/, /package-lock\.json$/];
const MAX_FILE_SIZE = 400 * 1024;  // 400KB
const MAX_CHUNK_SIZE = 80 * 1024;  // 80KB

function shouldInclude(filePath: string): boolean {
  const ext = path.extname(filePath);
  const base = path.basename(filePath);

  // Allow .env.example explicitly
  if (base === ".env.example") return true;

  if (!INCLUDE_EXTENSIONS.has(ext)) return false;
  if (EXCLUDE_PATTERNS.some((re) => re.test(filePath))) return false;
  return true;
}

function collectFiles(dir: string, baseDir: string): FileMetadata[] {
  const results: FileMetadata[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    log("warn", `[Scanner] Cannot read directory: ${dir}`);
    return results;
  }

  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      if (!shouldInclude(fullPath)) continue;

      const stat = fs.statSync(fullPath);

      if (stat.size > MAX_FILE_SIZE) {
        log("warn", `[Scanner] Skipping large file (${Math.round(stat.size / 1024)}KB): ${relativePath}`);
        continue;
      }

      let content: string;
      try {
        content = fs.readFileSync(fullPath, "utf-8");
      } catch {
        log("warn", `[Scanner] Cannot read file: ${relativePath}`);
        continue;
      }

      results.push({
        name: entry.name,
        path: relativePath,
        size_bytes: stat.size,
        lines: content.split("\n").length,
      });
    }
  }

  return results;
}

function buildChunks(scanPaths: string[]): { chunks: FileChunk[]; allFiles: FileMetadata[] } {
  const allFiles: FileMetadata[] = [];

  for (const scanPath of scanPaths) {
    const absPath = path.resolve(scanPath);
    if (!fs.existsSync(absPath)) {
      log("warn", `[Scanner] Path not found: ${absPath}`);
      continue;
    }
    allFiles.push(...collectFiles(absPath, path.resolve(".")));
  }

  // Group into chunks ≤ 80KB
  const chunks: FileChunk[] = [];
  let currentChunk: FileChunk = { content: "", files: [], size_bytes: 0 };

  for (const fileMeta of allFiles) {
    const absPath = path.resolve(fileMeta.path);
    let content: string;
    try {
      content = fs.readFileSync(absPath, "utf-8");
    } catch {
      // Try relative path from cwd
      try {
        content = fs.readFileSync(fileMeta.path, "utf-8");
      } catch {
        log("warn", `[Scanner] Cannot read for chunking: ${fileMeta.path}`);
        continue;
      }
    }

    const fileBlock = `\n// === FILE: ${fileMeta.path} ===\n${content}\n`;
    const blockSize = Buffer.byteLength(fileBlock, "utf-8");

    if (currentChunk.size_bytes + blockSize > MAX_CHUNK_SIZE && currentChunk.files.length > 0) {
      chunks.push(currentChunk);
      currentChunk = { content: "", files: [], size_bytes: 0 };
    }

    currentChunk.content += fileBlock;
    currentChunk.files.push(fileMeta);
    currentChunk.size_bytes += blockSize;
  }

  if (currentChunk.files.length > 0) {
    chunks.push(currentChunk);
  }

  log("info", `[Scanner] ${allFiles.length} files collected → ${chunks.length} chunks`);
  return { chunks, allFiles };
}

export function scanCodebase(customPaths?: string[]): { chunks: FileChunk[]; allFiles: FileMetadata[] } {
  const rawPaths = customPaths ?? (process.env.SECURITY_SCAN_PATHS ?? "./src").split(",");
  const scanPaths = rawPaths.map((p) => p.trim()).filter(Boolean);
  log("info", `[Scanner] Scanning paths: ${scanPaths.join(", ")}`);
  return buildChunks(scanPaths);
}
