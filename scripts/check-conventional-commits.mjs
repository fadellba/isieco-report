#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node scripts/check-conventional-commits.mjs <commit-subjects-file>');
  process.exit(2);
}

let subjects;
try {
  subjects = readFileSync(inputPath, 'utf8')
    .split(/\r?\n/u)
    .map((subject) => subject.trim())
    .filter(Boolean);
} catch (error) {
  console.error(`Unable to read commit subjects from ${inputPath}:`, error);
  process.exit(2);
}

const conventionalCommitPattern =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9][a-z0-9._/-]*\))?!?: .+$/u;

const invalidSubjects = subjects.filter((subject) => !conventionalCommitPattern.test(subject));

if (invalidSubjects.length > 0) {
  console.error('Invalid commit subject(s). Expected Conventional Commits: type(scope): description');
  for (const subject of invalidSubjects) {
    console.error(`  - ${subject}`);
  }
  process.exit(1);
}

console.log(`Validated ${subjects.length} Conventional Commit subject(s).`);
