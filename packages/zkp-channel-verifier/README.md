# ZKP Channel Verifier

An Electron application for Intermediate Proof verification and generating new proofs based on State Channels.

## Key Features

### 1. Intermediate Proof Verification
- Upload ZIP files containing proof files and EVM State related files
- Execute proof verification through tokamak-zk-evm binaries
- Display verification results (True/False)

### 2. New Proof Generation
- Upload State Channel's last state file
- Enter token transfer information (recipient address, amount)
- Generate proof through tokamak-zk-evm binaries
- Download generated proof and related files as ZIP

## Development Environment Setup

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
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

## Project Structure

```
zkp-channel-verifier/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script
│   ├── renderer.tsx         # React renderer entry point
│   ├── App.tsx              # Main App component
│   ├── style.css            # Global styles
│   ├── pages/               # Page components
│   │   ├── MainMenu.tsx     # Main menu screen
│   │   ├── VerifyProof.tsx  # Proof verification screen
│   │   └── GenerateProof.tsx # Proof generation screen
│   ├── types/               # TypeScript type definitions
│   └── binaries/            # tokamak-zk-evm binary files
├── package.json
├── tsconfig.json
├── forge.config.ts
└── README.md
```

## Usage

### 1. Main Screen
When you launch the app, two menus are displayed:
- **Intermediate Proof Verification**: Verify existing proofs
- **New Proof Generation**: Generate new proofs based on State Channels

### 2. Intermediate Proof Verification
1. Click the "Intermediate Proof Verification" menu
2. Upload a ZIP file containing proof files and EVM state files
3. Click the "Run Verify" button
4. Check the verification result (success/failure)

### 3. New Proof Generation
1. Click the "New Proof Generation" menu
2. Upload the State Channel's last state file
3. Enter token transfer information:
   - Recipient address (To Address)
   - Transfer amount (Amount)
4. Click the "Run Proof Generation" button
5. After completion, download the result ZIP file
6. Upload the downloaded file in the browser to submit

## Tech Stack

- **Electron**: Cross-platform desktop application
- **React**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **react-router-dom**: Routing

## License

MIT

## Author

Tokamak Network
