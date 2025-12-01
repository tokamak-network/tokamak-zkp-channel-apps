# Tokamak ZKP Channel Verifier - Integration Guide

## 📦 Setup

### 1. Sync dist from Tokamak-zk-EVM

First, build the binaries in Tokamak-zk-EVM:

```bash
cd ~/Desktop/dev/Tokamak-zk-EVM
./scripts/packaging.sh --macos --no-setup  # Fast build without setup
```

Then sync to zkp-channel-verifier:

```bash
cd ~/Desktop/dev/tokamak-zkp-channel-apps/packages/zkp-channel-verifier
./sync-dist.sh
```

This will copy:
- `bin/` - All compiled binaries (prove, verify, preprocess, trusted-setup)
- `backend-lib/icicle/` - ICICLE GPU libraries
- `resource/qap-compiler/` - QAP subcircuits
- `resource/setup/` - Setup files (if built with setup)

### 2. Install Dependencies

```bash
npm install
```

## 🚀 Usage

### Running the App

```bash
# Development mode
npm start

# Build production app
npm run make
```

### Using Proof Generation in UI

The `GenerateProof` page now supports:

1. **Upload State File** - Upload previous state snapshot (JSON)
2. **Select Recipient** - Choose from channel participants or enter manually
3. **Select Token** - Choose token type (fetched from on-chain)
4. **Enter Amount** - Transfer amount in smallest unit
5. **Generate Proof** - Synthesize circuit → Prove → Verify

## 📂 File Structure

```
src/
├── main.ts                    # Electron main process
│   └── IPC handlers for synthesizer/prover/verifier
├── preload.ts                 # Electron preload (exposes APIs)
├── synthesizer/               # Synthesizer integration
│   ├── types.ts              # TypeScript types
│   ├── pathHelper.ts         # Resource path resolution
│   └── binaryRunner.ts       # Rust binary execution
├── pages/
│   └── GenerateProof.tsx     # Proof generation UI
└── types/
    └── electron.d.ts         # Electron API types
```

## 🔧 API Usage

### Synthesize and Prove (Full Workflow)

```typescript
const result = await window.electronAPI.synthesizeAndProve({
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY',
  calldata: '0xa9059cbb...',  // ERC20 transfer calldata
  contractAddress: '0x...',
  publicKeyListL2: [pubKey1, pubKey2, pubKey3],
  addressListL1: ['0x...', '0x...', '0x...'],
  senderL2PrvKey: privateKey,
  blockNumber: 12345,
  previousState: stateSnapshot,  // Optional
  txNonce: 0n,
});

if (result.success && result.verified) {
  console.log('Proof verified!');
  console.log('Proof file:', result.files.proof);
}
```

### Event Listeners

```typescript
// Listen to synthesis progress
window.electronAPI.onStatusUpdate((status) => {
  console.log(status);  // "Running preprocess...", "Generating proof...", etc.
});

// Listen to prover output
window.electronAPI.onProverStdout((data) => {
  console.log('[Prover]', data);
});

// Listen to verifier output
window.electronAPI.onVerifierStdout((data) => {
  console.log('[Verifier]', data);
});
```

## 📁 Output Files

Generated files are stored in:
```
~/Library/Application Support/zkp-channel-verifier/proofs/<timestamp>/
├── synthesizer/
│   ├── instance.json
│   ├── placementVariables.json
│   └── permutation.json
└── proof/
    └── proof.json
```

## 🔄 Updating Binaries

Whenever you rebuild Tokamak-zk-EVM:

```bash
# 1. Rebuild in Tokamak-zk-EVM
cd ~/Desktop/dev/Tokamak-zk-EVM
./scripts/packaging.sh --macos --no-setup

# 2. Sync to zkp-channel-verifier
cd ~/Desktop/dev/tokamak-zkp-channel-apps/packages/zkp-channel-verifier
./sync-dist.sh

# 3. Restart Electron app
npm start
```

## ⚠️ Common Issues

### "Prover binary not found"
- Run `./sync-dist.sh` to sync binaries
- Check `src/binaries/bin/` exists and contains executables

### "ICICLE library not found"
- Ensure `src/binaries/backend-lib/icicle/lib/` exists
- Check library paths in `pathHelper.ts`

### "instance.json not found"
- Ensure SynthesizerAdapter generated the files
- Check output directory permissions

### "Preprocess failed"
- Setup files might be missing
- Run trusted-setup in Tokamak-zk-EVM with setup enabled:
  ```bash
  ./scripts/packaging.sh --macos
  ```

## 🎯 Next Steps

1. **Integrate SynthesizerAdapter** - Currently placeholder in `main.ts`
   - Copy SynthesizerAdapter from Tokamak-zk-EVM
   - Add ethers.js and @ethereumjs/* dependencies
   - Implement calldata synthesis in `synthesize-and-prove` handler

2. **Add State Management** - Save/load channel states
   - Implement state snapshot storage
   - Add state history tracking

3. **Improve UI/UX** - Better progress indicators
   - Add progress bars for proof generation
   - Show intermediate step results
   - Add error recovery options

## 📚 Reference

- [Tokamak-zk-EVM Repository](https://github.com/tokamak-network/Tokamak-zk-EVM)
- [Synthesizer Documentation](https://tokamak.notion.site/Synthesizer-documentation-164d96a400a3808db0f0f636e20fca24)
- [ICICLE Library](https://github.com/ingonyama-zk/icicle)

