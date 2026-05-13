import { describe, expect, test } from 'vitest';
import { createProgram } from '../src/cli.js';

describe('capsule cli', () => {
  test('prints help with all commands', () => {
    const output = createProgram().helpInformation();

    expect(output).toContain('capsule');
    expect(output).toContain('Usage:');
    expect(output).toContain('init');
    expect(output).toContain('doctor');
    expect(output).toContain('launch');
    expect(output).toContain('clean');
  });
});
