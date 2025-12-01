# ZKP Channel Verifier

Intermediate Proof Verifier and State Channel Proof Generator for Tokamak zkEVM.

## Quick Start

```bash
# Install dependencies
npm install

# Sync binaries from Tokamak-zk-EVM
./sync-dist.sh

# Run in development
npm start

# Build production app
npm run make
```

## Features

- 🔐 **Proof Generation** - Generate ZK proofs for L2 state channel transactions
- ✅ **Proof Verification** - Verify proofs using GPU-accelerated ICICLE library
- 📊 **Channel Management** - Fetch channel data from on-chain RollupBridge
- 💾 **State Management** - Track and manage L2 state snapshots
- 🎨 **Modern UI** - Beautiful interface built with React and Tailwind CSS

## Documentation

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for detailed integration instructions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Main Process                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IPC Handlers                                         │   │
│  │  - synthesize-and-prove                              │   │
│  │  - run-prover                                        │   │
│  │  - run-verifier                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│              ↓                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Binary Runner                                        │   │
│  │  - runProver()   → bin/prove                         │   │
│  │  - runVerifier() → bin/verify                        │   │
│  │  - runPreprocess() → bin/preprocess                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React UI (GenerateProof.tsx)                        │   │
│  │  - Upload state file                                 │   │
│  │  - Configure transaction                             │   │
│  │  - Generate & verify proof                           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Electron** - Desktop app framework
- **React** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS
- **Vite** - Build tool
- **Rust** - Backend binaries (prove, verify)
- **ICICLE** - GPU-accelerated cryptography

## License

MIT OR Apache-2.0
