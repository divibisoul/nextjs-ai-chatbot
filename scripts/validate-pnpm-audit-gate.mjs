#!/usr/bin/env node
import fs from 'node:fs';

const report = fs.readFileSync(process.argv[2] ?? 'pnpm-audit.txt', 'utf8');
const high = report.match(/Severity:[^\n]*?\b(\d+)\s+high\b/);
const highCount = high ? Number(high[1]) : Number.NaN;
const exactUnpatchedBraces =
  report.includes('Package             │ braces') &&
  report.includes('Vulnerable versions │ <=3.0.3') &&
  report.includes('Patched versions    │ <0.0.0') &&
  report.includes('GHSA-vfj7-8cjw-p6xm');

if (highCount === 1 && exactUnpatchedBraces) {
  console.log('SECURITY_AUDIT: BLOCKED_UPSTREAM_NO_PATCH');
  console.log('Package: braces@3.0.3');
  console.log('Advisory: GHSA-vfj7-8cjw-p6xm');
  console.log('Policy: preserve audit evidence; do not suppress, force-upgrade, or claim remediation.');
  process.exit(0);
}

console.error('SECURITY_AUDIT: UNRESOLVED_ACTIONABLE_FINDING');
process.exit(1);
