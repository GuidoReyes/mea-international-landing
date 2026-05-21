export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type Difficulty = 'EASY' | 'MEDIUM' | 'COMPLEX';
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface FixGuide {
  steps: string[];
  code_before: string;
  code_after: string;
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

export interface FileChunk {
  content: string;
  files: FileMetadata[];
  size_bytes: number;
}

export interface FileMetadata {
  name: string;
  path: string;
  size_bytes: number;
  lines: number;
}

export interface ScanProgress {
  scan_id: string;
  status: ScanStatus;
  progress_percent: number;
  files_scanned: number;
  total_files: number;
  current_file?: string;
}
