#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);
const allowedEnvNames = [
  'EXPO_PUBLIC_KAKAO_MAP_JS_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const extensions = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.json',
  '.md',
  '.html',
  '.css',
  '.yml',
  '.yaml',
  '.toml',
  '.config',
]);
const exactNames = new Set([
  'package.json',
  'package-lock.json',
  'eslint.config.js',
  'vite.config.ts',
  'tsconfig.json',
  'tsconfig.app.json',
  'tsconfig.node.json',
]);

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/i,
  /\b(?:api[_-]?key|access[_-]?token|secret|client[_-]?secret)\b\s*[:=]\s*['"][^'"]{12,}['"]/i,
  /\bservice_role\b\s*[:=]\s*['"][^'"]{20,}['"]/i,
  /\bKAKAO(?:_MAP)?(?:_JS)?_KEY\b\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /\bEXPO_PUBLIC_[A-Z0-9_]+\b\s*=\s*[^\s#]{8,}/,
];

function shouldScan(fileName) {
  return exactNames.has(fileName) || extensions.has(extname(fileName));
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
    } else if (entry.isFile() && shouldScan(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function isAllowedReference(line) {
  for (const name of allowedEnvNames) {
    const assignmentPattern = new RegExp(`\\b${name}\\b\\s*[:=]`);
    if (assignmentPattern.test(line)) return false;
  }

  const withoutAllowedNames = allowedEnvNames.reduce(
    (value, name) => value.replaceAll(name, ''),
    line,
  );
  return !secretPatterns.some((pattern) => pattern.test(withoutAllowedNames));
}

const findings = [];

for (const file of walk(root)) {
  const rel = relative(root, file);
  if (/\.env(?:\.|$)/.test(rel)) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (secretPatterns.some((pattern) => pattern.test(line)) && !isAllowedReference(line)) {
      findings.push({
        file: rel,
        line: index + 1,
        text: line.trim(),
      });
    }
  });
}

if (findings.length > 0) {
  console.error('Potential hardcoded secrets found:');
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.text}`);
  }
  process.exit(1);
}

console.log('No likely hardcoded secrets found.');
