#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);
const testFilePattern = /\.(test|spec)\.tsx?$/;
const blockedPatterns = [
  /\btest\.only\s*\(/,
  /\bit\.only\s*\(/,
  /\bdescribe\.only\s*\(/,
  /\btest\.skip\s*\(/,
  /\bit\.skip\s*\(/,
  /\bdescribe\.skip\s*\(/,
  /\bxit\s*\(/,
  /\bxdescribe\s*\(/,
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && testFilePattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const findings = [];

for (const file of walk(root)) {
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (blockedPatterns.some((pattern) => pattern.test(line))) {
      findings.push({
        file: relative(root, file),
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error('Skipped or focused tests found:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log('No skipped or focused tests found.');
