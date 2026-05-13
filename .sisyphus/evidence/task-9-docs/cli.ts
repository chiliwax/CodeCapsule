#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';
import { launchCommand } from './commands/launch.js';
import { cleanCommand } from './commands/clean.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('codecapsule')
    .description('Safe isolated Docker launcher for OpenCode and other coding agents')
    .version('0.1.0');

  program.addCommand(initCommand);
  program.addCommand(doctorCommand);
  program.addCommand(launchCommand);
  program.addCommand(cleanCommand);

  return program;
}

export function main(argv = process.argv): void {
  createProgram().parse(argv);
}

const cliPath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (cliPath === entryPath) {
  main();
}
