#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Command, CommanderError } from 'commander';
import { initCommand } from './commands/init.js';
import { doctorCommand } from './commands/doctor.js';
import { launchCommand } from './commands/launch.js';
import { cleanCommand } from './commands/clean.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('codecapsule')
    .description('Safe isolated Docker launcher for OpenCode')
    .version('0.1.0');

  program.addCommand(initCommand);
  program.addCommand(doctorCommand);
  program.addCommand(launchCommand);
  program.addCommand(cleanCommand);

  return program;
}

export function main(argv = process.argv): void {
  const program = createProgram();
  program.exitOverride();

  try {
    if (argv.length <= 2) {
      program.outputHelp();
      process.exitCode = 0;
      return;
    }

    program.parse(argv);
  } catch (error) {
    if (error instanceof CommanderError) {
      process.exitCode = error.exitCode ?? 1;
    } else if (error instanceof Error) {
      process.stderr.write(`Error: ${error.message}\n`);
      process.exitCode = 1;
    } else {
      process.stderr.write(`Error: ${String(error)}\n`);
      process.exitCode = 1;
    }
  }
}

const cliPath = fileURLToPath(import.meta.url);
const entryPath = process.argv[1] ? resolve(process.argv[1]) : '';

if (cliPath === entryPath) {
  main();
}
