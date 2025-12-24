# Tokamak ZKP Channel Apps

A collection of ZK-EVM based State Channel applications for Tokamak Network.

## 📦 Package Structure

### `zkp-channel-verifier`
An Electron desktop application for Intermediate Proof verification and generating new proofs based on State Channels.

**Key Features:**
- 🔍 **Intermediate Proof Verification**: Upload proof files and EVM State files for verification
- ⚡ **New Proof Generation**: Generate new proofs based on the last state of State Channels
- 📦 **Result Download**: Download generated proofs as ZIP files

[View detailed documentation](./packages/zkp-channel-verifier/README.md)

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/tokamak-network/tokamak-zkp-channel-apps.git
cd tokamak-zkp-channel-apps

# Install zkp-channel-verifier
cd packages/zkp-channel-verifier
npm install
```

### Run in Development Mode

```bash
npm start
```

### Build

```bash
npm run make
```

## 🛠️ Tech Stack

- **Electron**: Cross-platform desktop application
- **React**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **tokamak-zk-evm**: ZK-EVM binaries

## 📝 License

MIT

## 👥 Contributors

Tokamak Network

## 🔗 Related Projects

- [Tokamak-zk-EVM](https://github.com/tokamak-network/Tokamak-zk-EVM)
- [Tokamak-zk-EVM-playgrounds](https://github.com/tokamak-network/Tokamak-zk-EVM-playgrounds)
