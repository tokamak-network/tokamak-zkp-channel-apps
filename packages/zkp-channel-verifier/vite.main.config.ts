import { defineConfig } from "vite";
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from "fs";
import { resolve, join } from "path";

// Custom plugin to copy binaries
function copyBinaries() {
  return {
    name: 'copy-binaries',
    writeBundle() {
      const srcDir = resolve(__dirname, 'src/binaries');
      const destDir = resolve(__dirname, '.vite/binaries');
      
      if (!existsSync(srcDir)) {
        console.warn('[copy-binaries] Source directory not found:', srcDir);
        return;
      }

      function copyRecursive(src: string, dest: string) {
        if (!existsSync(dest)) {
          mkdirSync(dest, { recursive: true });
        }

        const entries = readdirSync(src);
        for (const entry of entries) {
          const srcPath = join(src, entry);
          const destPath = join(dest, entry);
          
          if (statSync(srcPath).isDirectory()) {
            copyRecursive(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
            console.log('[copy-binaries] Copied:', entry);
          }
        }
      }

      console.log('[copy-binaries] Copying binaries from', srcDir, 'to', destDir);
      copyRecursive(srcDir, destDir);
    },
  };
}

export default defineConfig({
  plugins: [copyBinaries()],
});

