# Task ID: 74

**Title:** Implement Security Agent Scanner Module

**Status:** done

**Dependencies:** 72 ✓

**Priority:** high

**Description:** Build src/security-agent/scanner.ts to recursively read codebase files, filter by type, chunk for Claude API, and skip large files

**Details:**

Create scanner.ts with:

import * as fs from 'fs';
import * as path from 'path';

interface FileChunk {
  files: Array<{ name: string; path: string; content: string; size: number; lines: number }>;
  totalSize: number;
}

export async function scanCodebase(): Promise<FileChunk[]> {
  const scanPaths = (process.env.SECURITY_SCAN_PATHS || './src').split(',').map(p => p.trim());
  const MAX_FILE_SIZE = 400 * 1024; // 400KB
  const MAX_CHUNK_SIZE = 80 * 1024; // 80KB
  const INCLUDE_EXTS = ['.ts', '.js', '.json'];
  const EXCLUDE_DIRS = ['node_modules', 'dist', '.git', 'coverage'];
  const EXCLUDE_FILES = ['package-lock.json'];
  const EXCLUDE_PATTERNS = ['.test.ts', '.spec.ts'];

  const allFiles: Array<{name: string; path: string; content: string; size: number; lines: number}> = [];

  function walkDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(entry.name)) walkDir(fullPath);
      } else {
        const ext = path.extname(entry.name);
        if (INCLUDE_EXTS.includes(ext) && 
            !EXCLUDE_FILES.includes(entry.name) &&
            !EXCLUDE_PATTERNS.some(p => entry.name.includes(p))) {
          const stat = fs.statSync(fullPath);
          if (stat.size > MAX_FILE_SIZE) {
            console.warn(`Skipping large file: ${fullPath} (${stat.size} bytes)`);
            continue;
          }
          const content = fs.readFileSync(fullPath, 'utf8');
          allFiles.push({
            name: entry.name,
            path: fullPath,
            content,
            size: stat.size,
            lines: content.split('\n').length
          });
        }
      }
    }
  }

  for (const scanPath of scanPaths) {
    const resolvedPath = path.resolve(scanPath);
    if (fs.existsSync(resolvedPath)) walkDir(resolvedPath);
  }

  // Chunk files into groups of max 80KB
  const chunks: FileChunk[] = [];
  let currentChunk: FileChunk = { files: [], totalSize: 0 };

  for (const file of allFiles) {
    if (currentChunk.totalSize + file.size > MAX_CHUNK_SIZE && currentChunk.files.length > 0) {
      chunks.push(currentChunk);
      currentChunk = { files: [], totalSize: 0 };
    }
    currentChunk.files.push(file);
    currentChunk.totalSize += file.size;
  }

  if (currentChunk.files.length > 0) chunks.push(currentChunk);
  return chunks;
}

Use path.join(__dirname, ...) for Railway compatibility.

**Test Strategy:**

Unit test: mock fs.readdirSync and verify correct filtering of .ts/.js/.json files, exclusion of node_modules/dist/.git, skipping of files > 400KB, and chunking logic keeps chunks under 80KB
