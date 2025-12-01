import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getBinaryPaths } from './pathHelper';
import type { ProveResult, VerifyResult } from './types';

/**
 * Run prover binary
 */
export async function runProver(
  synthesizerOutputDir: string,
  proveOutputDir: string,
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void,
): Promise<ProveResult> {
  const { proverBin, qapPath, setupPath, icicleLibPath } = getBinaryPaths();

  // Ensure output directory exists
  mkdirSync(proveOutputDir, { recursive: true });

  console.log('[runProver] Starting prover...');
  console.log(`  Binary: ${proverBin}`);
  console.log(`  QAP: ${qapPath}`);
  console.log(`  Synthesizer: ${synthesizerOutputDir}`);
  console.log(`  Setup: ${setupPath}`);
  console.log(`  Output: ${proveOutputDir}`);

  // Check if required files exist
  if (!existsSync(proverBin)) {
    return { success: false, error: `Prover binary not found: ${proverBin}` };
  }
  if (!existsSync(resolve(synthesizerOutputDir, 'instance.json'))) {
    return { success: false, error: `instance.json not found in ${synthesizerOutputDir}` };
  }

  return new Promise((resolve) => {
    const proc = spawn(proverBin, [qapPath, synthesizerOutputDir, setupPath, proveOutputDir], {
      env: {
        ...process.env,
        ICICLE_BACKEND_INSTALL_DIR: icicleLibPath,
      },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (onStdout) onStdout(text);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (onStderr) onStderr(text);
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        console.log('[runProver] ✅ Prover completed successfully');
        resolve({ success: true, outputDir: proveOutputDir });
      } else {
        console.error(`[runProver] ❌ Prover failed with code ${code}`);
        console.error(`stderr: ${stderr}`);
        resolve({ success: false, error: `Prover exited with code ${code}: ${stderr}` });
      }
    });

    proc.on('error', (error: Error) => {
      console.error('[runProver] ❌ Failed to start prover:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Run verifier binary
 */
export async function runVerifier(
  synthesizerOutputDir: string,
  proveOutputDir: string,
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void,
): Promise<VerifyResult> {
  const { verifierBin, qapPath, setupPath, preprocessPath, icicleLibPath } = getBinaryPaths();

  console.log('[runVerifier] Starting verifier...');
  console.log(`  Binary: ${verifierBin}`);
  console.log(`  Proof: ${proveOutputDir}`);

  // Check if required files exist
  if (!existsSync(verifierBin)) {
    return { success: false, error: `Verifier binary not found: ${verifierBin}` };
  }
  if (!existsSync(resolve(proveOutputDir, 'proof.json'))) {
    return { success: false, error: `proof.json not found in ${proveOutputDir}` };
  }

  return new Promise((resolve) => {
    const proc = spawn(
      verifierBin,
      [qapPath, synthesizerOutputDir, setupPath, preprocessPath, proveOutputDir],
      {
        env: {
          ...process.env,
          ICICLE_BACKEND_INSTALL_DIR: icicleLibPath,
        },
        stdio: 'pipe',
      },
    );

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (onStdout) onStdout(text);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (onStderr) onStderr(text);
    });

    proc.on('close', (code: number) => {
      const verified = code === 0 && stdout.includes('true');
      if (verified) {
        console.log('[runVerifier] ✅ Verification passed');
        resolve({ success: true, verified: true });
      } else if (code === 0) {
        console.log('[runVerifier] ❌ Verification failed (returned false)');
        resolve({ success: true, verified: false });
      } else {
        console.error(`[runVerifier] ❌ Verifier failed with code ${code}`);
        resolve({ success: false, error: `Verifier exited with code ${code}: ${stderr}` });
      }
    });

    proc.on('error', (error: Error) => {
      console.error('[runVerifier] ❌ Failed to start verifier:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

/**
 * Run preprocess binary (one-time setup per circuit)
 */
export async function runPreprocess(
  synthesizerOutputDir: string,
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void,
): Promise<ProveResult> {
  const { preprocessBin, qapPath, setupPath, preprocessPath, icicleLibPath } = getBinaryPaths();

  // Check if preprocess already exists
  if (existsSync(resolve(preprocessPath, 'preprocess.json'))) {
    console.log('[runPreprocess] ℹ️  Preprocess files already exist, skipping...');
    return { success: true, outputDir: preprocessPath };
  }

  console.log('[runPreprocess] Starting preprocess...');

  // Ensure output directory exists
  mkdirSync(preprocessPath, { recursive: true });

  return new Promise((resolve) => {
    const proc = spawn(preprocessBin, [qapPath, synthesizerOutputDir, setupPath, preprocessPath], {
      env: {
        ...process.env,
        ICICLE_BACKEND_INSTALL_DIR: icicleLibPath,
      },
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      if (onStdout) onStdout(text);
    });

    proc.stderr.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      if (onStderr) onStderr(text);
    });

    proc.on('close', (code: number) => {
      if (code === 0) {
        console.log('[runPreprocess] ✅ Preprocess completed');
        resolve({ success: true, outputDir: preprocessPath });
      } else {
        console.error(`[runPreprocess] ❌ Preprocess failed with code ${code}`);
        resolve({ success: false, error: `Preprocess exited with code ${code}: ${stderr}` });
      }
    });

    proc.on('error', (error: Error) => {
      console.error('[runPreprocess] ❌ Failed to start preprocess:', error);
      resolve({ success: false, error: error.message });
    });
  });
}

