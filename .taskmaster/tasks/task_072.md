# Task ID: 72

**Title:** Create TypeScript Interfaces and Type Definitions for Security Agent

**Status:** done

**Dependencies:** 71 ✓

**Priority:** high

**Description:** Define all TypeScript interfaces in src/security-agent/types.ts for Severity, Difficulty, ScanStatus, FixGuide, Vulnerability, and ScanResult

**Details:**

Create src/security-agent/types.ts with:

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Difficulty = 'EASY' | 'MEDIUM' | 'COMPLEX';
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface FixGuide {
  steps: string[];
  code_before?: string;
  code_after?: string;
  difficulty: Difficulty;
  estimated_time: string;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: Severity;
  file: string;
  line: number;
  code_snippet: string;
  description: string;
  attack_scenario: string;
  business_impact: string;
  owasp_reference: string;
  cve_reference?: string;
  fix_guide: FixGuide;
  resolved: boolean;
  resolved_at?: string;
}

export interface ScanResult {
  scan_id: string;
  timestamp: string;
  project_name: string;
  files_scanned: number;
  security_score: number;
  vulnerabilities: Vulnerability[];
  scan_summary: string;
  status: ScanStatus;
  duration_ms: number;
}

Use strict typing throughout.

**Test Strategy:**

Run tsc --noEmit to verify no type errors, import types in a test file to confirm exports work correctly

## Subtasks

### 72.1. Create security-agent directory structure

**Status:** done  
**Dependencies:** None  

Create the src/security-agent/ directory in the backend folder to house all security agent TypeScript files

**Details:**

Create the directory at backend/src/security-agent/ using mkdir -p. This directory will contain types.ts along with other security agent modules (scanner.ts, analyzer.ts, reporter.ts, etc.). Verify the directory exists and is at the correct path within the existing backend/src/ structure alongside routes/, lib/, middleware/, etc.

### 72.2. Define union type aliases Severity, Difficulty, and ScanStatus

**Status:** done  
**Dependencies:** 72.1  

Create types.ts file with the three fundamental union type aliases that define severity levels, fix difficulty, and scan status states

**Details:**

Create backend/src/security-agent/types.ts with three exported type aliases:
- export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
- export type Difficulty = 'EASY' | 'MEDIUM' | 'COMPLEX';
- export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

Use string literal union types (not enums) to match the existing codebase patterns seen in advisor-notify.ts. Place these at the top of the file before interfaces.

### 72.3. Define FixGuide interface with remediation properties

**Status:** done  
**Dependencies:** 72.2  

Add the FixGuide interface that describes step-by-step fix instructions with code examples and difficulty estimation

**Details:**

Add to types.ts:
export interface FixGuide {
  steps: string[];           // Array of remediation steps
  code_before?: string;      // Optional: vulnerable code snippet
  code_after?: string;       // Optional: fixed code snippet
  difficulty: Difficulty;    // References the Difficulty type alias
  estimated_time: string;    // e.g., '15 minutes', '1 hour'
}

Note that FixGuide references the Difficulty type, so order matters. Use optional properties (?) for code_before and code_after as specified in the PRD.

### 72.4. Define Vulnerability interface with complete security finding properties

**Status:** done  
**Dependencies:** 72.3  

Add the comprehensive Vulnerability interface describing a single security finding with all metadata, OWASP references, and resolution status

**Details:**

Add to types.ts:
export interface Vulnerability {
  id: string;                // Unique vulnerability identifier
  title: string;             // Brief vulnerability title
  severity: Severity;        // References Severity type
  file: string;              // Affected file path
  line: number;              // Line number of vulnerability
  code_snippet: string;      // Vulnerable code excerpt
  description: string;       // Detailed explanation
  attack_scenario: string;   // How it could be exploited
  business_impact: string;   // Business consequences
  owasp_reference: string;   // OWASP category reference
  cve_reference?: string;    // Optional CVE ID
  fix_guide: FixGuide;       // References FixGuide interface
  resolved: boolean;         // Whether fixed
  resolved_at?: string;      // Optional ISO timestamp when resolved
}

This interface references both Severity and FixGuide types.

### 72.5. Define ScanResult interface and verify complete type exports

**Status:** done  
**Dependencies:** 72.4  

Add the ScanResult interface representing a complete security scan outcome and verify all types export correctly together

**Details:**

Add to types.ts:
export interface ScanResult {
  scan_id: string;              // Unique scan identifier
  timestamp: string;            // ISO 8601 timestamp
  project_name: string;         // Scanned project name
  files_scanned: number;        // Count of files analyzed
  security_score: number;       // 0-100 security score
  vulnerabilities: Vulnerability[];  // Array of findings
  scan_summary: string;         // Executive summary text
  status: ScanStatus;           // References ScanStatus type
  duration_ms: number;          // Scan duration in milliseconds
}

Final file should export all 6 types: Severity, Difficulty, ScanStatus, FixGuide, Vulnerability, ScanResult. Verify the file follows existing codebase conventions (no trailing commas in interfaces, consistent semicolons).
