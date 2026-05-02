#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.cwd();
const packagePath = join(root, 'package.json');
const results = [];

function record(name, status, detail = '') {
  results.push({ name, status, detail });
}

function run(name, command, args, options = {}) {
  try {
    execFileSync(command, args, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
      ...options,
    });
    record(name, 'passed');
  } catch (error) {
    record(name, 'failed', error.message);
  }
}

function scriptExists(scripts, name) {
  return Object.prototype.hasOwnProperty.call(scripts, name);
}

let scripts = {};
let dependencies = {};
let devDependencies = {};

if (existsSync(packagePath)) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  scripts = pkg.scripts || {};
  dependencies = pkg.dependencies || {};
  devDependencies = pkg.devDependencies || {};
} else {
  record('package.json', 'skipped', 'package.json not found');
}

if (scriptExists(scripts, 'typecheck')) {
  run('typecheck script', 'npm.cmd', ['run', 'typecheck']);
} else if (existsSync(join(root, 'tsconfig.json'))) {
  run('tsc --noEmit', 'npx.cmd', ['tsc', '--noEmit']);
} else {
  record('typecheck', 'skipped', 'no typecheck script or tsconfig.json');
}

if (scriptExists(scripts, 'lint')) {
  run('lint script', 'npm.cmd', ['run', 'lint']);
} else {
  record('lint', 'skipped', 'no lint script');
}

if (scriptExists(scripts, 'test')) {
  const hasJest = Boolean(dependencies.jest || devDependencies.jest);
  const args = hasJest ? ['run', 'test', '--', '--runInBand'] : ['run', 'test'];
  run('test script', 'npm.cmd', args);
} else {
  record('test', 'skipped', 'no test script');
}

run('harness:no-skipped-tests', 'node', ['scripts/harness/check-no-skipped-tests.js']);
run('harness:no-secrets', 'node', ['scripts/harness/check-no-secrets.js']);
run('harness:dangerous-diff', 'node', ['scripts/harness/check-dangerous-diff.js']);

console.log('\nVerification summary:');
for (const result of results) {
  const detail = result.detail ? ` - ${result.detail}` : '';
  console.log(`${result.status.toUpperCase()}: ${result.name}${detail}`);
}

if (results.some((result) => result.status === 'failed')) {
  process.exit(1);
}
