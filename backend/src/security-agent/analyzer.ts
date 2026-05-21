import Anthropic from "@anthropic-ai/sdk";
import { log } from "../lib/logger";
import type { FileChunk, Vulnerability } from "./types";

const SYSTEM_PROMPT = `You are a cybersecurity expert specialized in TypeScript/Node.js/Express code auditing. Analyze the provided source code and return ONLY a valid JSON object, no markdown, no extra text.

JSON schema:
{
  "vulnerabilities": [
    {
      "id": "vuln_001",
      "title": "Descriptive vulnerability name",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "relative/path/to/file.ts",
      "line": 42,
      "code_snippet": "exact vulnerable line",
      "description": "What this vulnerability is and why it exists",
      "attack_scenario": "Concrete scenario of how an attacker exploits it",
      "business_impact": "Real consequences if exploited",
      "owasp_reference": "OWASP A01:2021 or applicable",
      "cve_reference": "CVE-XXXX-XXXXX or null",
      "fix_guide": {
        "steps": ["Step 1", "Step 2"],
        "code_before": "vulnerable code",
        "code_after": "fixed code",
        "difficulty": "EASY|MEDIUM|COMPLEX",
        "estimated_time": "15 minutes"
      },
      "resolved": false
    }
  ],
  "security_score": 75,
  "scan_summary": "Executive summary in 2-3 sentences"
}

Look specifically for: SQL injection in raw Prisma queries, hardcoded secrets, JWT misconfiguration, CORS misconfiguration, missing rate limiting, weak input validation, error handling exposing stack traces, path traversal, prototype pollution, command injection, unvalidated env vars, logging sensitive data, IDOR in Prisma queries.

If no real vulnerabilities found, return empty array with high score.
NEVER invent vulnerabilities.`;

interface ChunkAnalysis {
  vulnerabilities: Vulnerability[];
  security_score: number;
  scan_summary: string;
}

async function analyzeChunk(
  client: Anthropic,
  chunk: FileChunk,
  chunkIndex: number
): Promise<ChunkAnalysis> {
  const fileList = chunk.files.map((f) => f.path).join(", ");
  log("info", `[Analyzer] Chunk ${chunkIndex + 1}: analyzing ${chunk.files.length} files (${Math.round(chunk.size_bytes / 1024)}KB) — ${fileList}`);

  const userMessage = `Analyze this source code for security vulnerabilities:\n\n${chunk.content}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await client.messages.create(
        {
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        },
        { timeout: 60000 }
      );

      const text = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

      // Strip markdown code fences if Claude added them despite instructions
      const jsonText = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

      const parsed = JSON.parse(jsonText) as ChunkAnalysis;
      log("info", `[Analyzer] Chunk ${chunkIndex + 1}: ${parsed.vulnerabilities.length} vulnerabilities found, score ${parsed.security_score}`);
      return parsed;
    } catch (err) {
      if (attempt === 1) {
        log("warn", `[Analyzer] Chunk ${chunkIndex + 1} attempt 1 failed, retrying: ${err instanceof Error ? err.message : String(err)}`);
      } else {
        log("error", `[Analyzer] Chunk ${chunkIndex + 1} failed after 2 attempts: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { vulnerabilities: [], security_score: 100, scan_summary: "analysis_failed" };
}

export async function analyzeChunks(
  chunks: FileChunk[],
  onProgress?: (completed: number, total: number) => void
): Promise<{ vulnerabilities: Vulnerability[]; avgScore: number; summaries: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const allVulnerabilities: Vulnerability[] = [];
  const scores: number[] = [];
  const summaries: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const result = await analyzeChunk(client, chunks[i], i);
    allVulnerabilities.push(...result.vulnerabilities);
    if (result.security_score !== undefined) scores.push(result.security_score);
    if (result.scan_summary && result.scan_summary !== "analysis_failed") {
      summaries.push(result.scan_summary);
    }
    onProgress?.(i + 1, chunks.length);
  }

  // Deduplicate by file+line+title
  const seen = new Set<string>();
  const unique = allVulnerabilities.filter((v) => {
    const key = `${v.file}:${v.line}:${v.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Re-index IDs sequentially
  unique.forEach((v, i) => {
    v.id = `vuln_${String(i + 1).padStart(3, "0")}`;
  });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 100;

  log("info", `[Analyzer] Total unique vulnerabilities: ${unique.length}, average score: ${avgScore}`);
  return { vulnerabilities: unique, avgScore, summaries };
}
