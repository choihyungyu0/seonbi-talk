#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function runGit(args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function hasGit() {
  try {
    runGit(['rev-parse', '--is-inside-work-tree']);
    return true;
  } catch {
    return false;
  }
}

if (!hasGit()) {
  console.warn('Git is unavailable or this is not a git repository; skipping dangerous diff check.');
  process.exit(0);
}

const nameStatus = runGit(['diff', '--name-status']);
const diff = runGit(['diff', '--', '.']);
const findings = [];

for (const line of nameStatus.split(/\r?\n/).filter(Boolean)) {
  const [status, ...pathParts] = line.split(/\s+/);
  const filePath = pathParts.join(' ');

  if (filePath === 'package.json') findings.push({ level: 'fail', reason: 'package.json changed' });
  if (filePath === 'app.json') findings.push({ level: 'fail', reason: 'app.json changed' });
  if (/\.env(?:\.|$)/.test(filePath)) findings.push({ level: 'fail', reason: `.env file changed: ${filePath}` });
  if (status.startsWith('D') && /\.(test|spec)\.tsx?$/.test(filePath)) {
    findings.push({ level: 'fail', reason: `test file deleted: ${filePath}` });
  }
  if (status.startsWith('D')) {
    findings.push({ level: 'warn', reason: `file deleted: ${filePath}` });
  }
}

const removedLines = diff
  .split(/\r?\n/)
  .filter((line) => line.startsWith('-') && !line.startsWith('---'));

const addedLines = diff
  .split(/\r?\n/)
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'));

if (removedLines.some((line) => /\bfallback\b|\bfacility list\b|\bnearby facility\b/i.test(line))) {
  findings.push({ level: 'fail', reason: 'diff appears to delete fallback or facility-list logic' });
}

if (addedLines.some((line) => /https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(line))) {
  findings.push({ level: 'fail', reason: 'diff appears to add a non-local URL' });
}

if (addedLines.some((line) => /\b\d{1,3}(?:\.\d{1,3}){3}\b/.test(line))) {
  findings.push({ level: 'fail', reason: 'diff appears to add a hardcoded IP address' });
}

if (findings.length > 0) {
  for (const finding of findings) {
    const prefix = finding.level === 'fail' ? 'FAIL' : 'WARN';
    console.error(`${prefix}: ${finding.reason}`);
  }
  if (findings.some((finding) => finding.level === 'fail')) {
    process.exit(1);
  }
}

console.log('No dangerous diff findings.');
