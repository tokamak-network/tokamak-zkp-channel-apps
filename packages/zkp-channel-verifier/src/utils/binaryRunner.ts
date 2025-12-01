/**
 * Binary Runner
 * 
 * Executes ZKP binaries (preprocess, prove, verify) using the configured binary paths.
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';
import { BINARIES, RESOURCES } from './binaryConfig';

export interface BinaryResult {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
}

type OutputCallback = (data: string) => void;

/**
 * Execute a binary command
 */
async function executeBinary(
  command: string,
  args: string[],
  onStdout?: OutputCallback,
  onStderr?: OutputCallback
): Promise<BinaryResult> {
  return new Promise((resolve) => {
    const cmdName = basename(command);
    console.log(`[BinaryRunner] Executing: ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      console.log(`[${cmdName}] ${text.trim()}`);
      if (onStdout) onStdout(text);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      console.error(`[${cmdName}] ${text.trim()}`);
      if (onStderr) onStderr(text);
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        console.log(`[BinaryRunner] Success: ${command}`);
        resolve({ success: true, stdout, stderr });
      } else {
        console.error(`[BinaryRunner] Failed: ${command} (exit code: ${code})`);
        resolve({
          success: false,
          stdout,
          stderr,
          error: `Process exited with code ${code}`,
        });
      }
    });

    proc.on('error', (error: Error) => {
      console.error(`[BinaryRunner] Error: ${command}:`, error);
      resolve({
        success: false,
        error: error.message,
      });
    });
  });
}

/**
 * Run preprocess (one-time setup)
 */
export async function runPreprocess(
  synthesizerOutputDir: string,
  onStdout?: OutputCallback,
  onStderr?: OutputCallback
): Promise<BinaryResult> {
  const preprocessOutputDir = RESOURCES.preprocess;

  // Check if preprocess already exists
  if (existsSync(resolve(preprocessOutputDir, 'preprocess.json'))) {
    console.log('[BinaryRunner] Preprocess files already exist, skipping...');
    return { success: true };
  }

  // Create output directory
  mkdirSync(preprocessOutputDir, { recursive: true });

  const args = [
    RESOURCES.qap,
    synthesizerOutputDir,
    RESOURCES.setup,
    preprocessOutputDir,
  ];

  return executeBinary(BINARIES.preprocess, args, onStdout, onStderr);
}

/**
 * Run prover
 */
export async function runProver(
  synthesizerOutputDir: string,
  proveOutputDir: string,
  onStdout?: OutputCallback,
  onStderr?: OutputCallback
): Promise<BinaryResult> {
  // Create output directory
  mkdirSync(proveOutputDir, { recursive: true });

  const args = [
    RESOURCES.qap,
    synthesizerOutputDir,
    RESOURCES.setup,
    proveOutputDir,
  ];

  return executeBinary(BINARIES.prove, args, onStdout, onStderr);
}

/**
 * Run verifier
 */
export async function runVerifier(
  synthesizerOutputDir: string,
  proveOutputDir: string,
  onStdout?: OutputCallback,
  onStderr?: OutputCallback
): Promise<BinaryResult> {
  const args = [
    RESOURCES.qap,
    synthesizerOutputDir,
    RESOURCES.setup,
    RESOURCES.preprocess,
    proveOutputDir,
  ];

  return executeBinary(BINARIES.verify, args, onStdout, onStderr);
}
