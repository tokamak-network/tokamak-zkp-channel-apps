import { app } from 'electron';
import { resolve } from 'path';

/**
 * Get the resource path for binaries
 * Works in both development and production
 */
export function getResourcePath(): string {
  if (app.isPackaged) {
    // Production: use process.resourcesPath
    return resolve(process.resourcesPath, 'binaries');
  } else {
    // Development: use src/binaries
    return resolve(__dirname, '../../binaries');
  }
}

/**
 * Get paths for all binary operations
 */
export function getBinaryPaths() {
  const resourcePath = getResourcePath();

  return {
    resourcePath,
    proverBin: resolve(resourcePath, 'bin/prove'),
    verifierBin: resolve(resourcePath, 'bin/verify'),
    preprocessBin: resolve(resourcePath, 'bin/preprocess'),
    trustedSetupBin: resolve(resourcePath, 'bin/trusted-setup'),
    qapPath: resolve(resourcePath, 'resource/qap-compiler/library'),
    setupPath: resolve(resourcePath, 'resource/setup/output'),
    preprocessPath: resolve(resourcePath, 'resource/preprocess/output'),
    icicleLibPath: resolve(resourcePath, 'backend-lib/icicle/lib/backend'),
  };
}

