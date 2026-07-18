# Task ID: 75

**Title:** Implement Security Agent Analyzer with Claude API Integration

**Status:** done

**Dependencies:** 72 ✓, 74 ✓

**Priority:** high

**Description:** Build src/security-agent/analyzer.ts to send code chunks to Claude Sonnet 4.6, parse vulnerability JSON responses, and handle retries

**Details:**

Create analyzer.ts:

import Anthropic from '@anthropic-ai/sdk';
import { Vulnerability } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-6';
const TIMEOUT = 60000;

const SYSTEM_PROMPT = `You are a cybersecurity expert specialized in TypeScript/Node.js/Express code auditing. Analyze the provided source code and return ONLY a valid JSON object, no markdown, no extra text.

JSON schema:
{
  "vulnerabilities": [...],
  "security_score": 75,
  "scan_summary": "Executive summary in 2-3 sentences"
}

Look specifically for: SQL injection in raw Prisma queries, hardcoded secrets, JWT misconfiguration, CORS misconfiguration, missing rate limiting, weak input validation, error handling exposing stack traces, path traversal, prototype pollution, command injection, unvalidated env vars, logging sensitive data, IDOR in Prisma queries.

If no real vulnerabilities found, return empty array with high score. NEVER invent vulnerabilities.`;

interface ChunkAnalysis {
  vulnerabilities: Vulnerability[];
  security_score: number;
  scan_summary: string;
}

export async function analyzeChunk(chunkContent: string, retryCount = 0): Promise<ChunkAnalysis> {
  try {
    const response = await Promise.race([
      client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: chunkContent }]
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT))
    ]) as Anthropic.Message;

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No text response');
    
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : textContent.text);
    return parsed as ChunkAnalysis;
  } catch (err) {
    if (retryCount < 1) {
      console.warn(`Retry analyzing chunk (attempt ${retryCount + 1})`);
      return analyzeChunk(chunkContent, retryCount + 1);
    }
    console.error('Analysis failed:', err);
    return { vulnerabilities: [], security_score: 0, scan_summary: 'Analysis failed' };
  }
}

Use claude-sonnet-4-6 model, 60s timeout, retry once on failure.

**Test Strategy:**

Mock Anthropic SDK, verify system prompt is sent correctly, confirm JSON parsing handles both raw JSON and markdown-wrapped responses, test retry logic triggers exactly once on failure, validate timeout enforcement
