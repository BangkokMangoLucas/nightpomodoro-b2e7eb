# NightPomodoro

A privacy-preserving Pomodoro timer dApp built with FHEVM (Fully Homomorphic Encryption Virtual Machine). Track your focus sessions on-chain with complete privacy - all data is encrypted before being stored.

## 🌟 Features

- **🔒 Privacy-First**: All focus time, interrupts, and statistics are encrypted using FHEVM before on-chain storage
- **⏱️ Pomodoro Timer**: 25-minute focus sessions with break tracking
- **📊 Analytics**: View your encrypted weekly statistics (decrypted locally in your browser)
- **🏆 Achievements**: Earn NFT badges for milestones
- **🌐 Multi-Network**: Supports Sepolia testnet and local Hardhat development
- **💼 Wallet Integration**: EIP-6963 compatible wallet discovery

## 📁 Project Structure

```
.
├── fhevm-hardhat-template/    # Smart contracts (Hardhat)
│   ├── contracts/             # Solidity contracts
│   │   ├── PomodoroCore.sol   # Main contract with FHE operations
│   │   └── PomodoroNFT.sol    # Achievement badges NFT
│   ├── deploy/                # Deployment scripts
│   ├── test/                  # Contract tests
│   └── tasks/                 # Hardhat custom tasks
│
└── nightpomodoro-frontend/    # Next.js frontend
    ├── app/                   # Next.js app router pages
    ├── components/            # React components
    ├── fhevm/                 # FHEVM integration layer
    ├── hooks/                 # React hooks
    └── scripts/               # Build scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- MetaMask or compatible wallet
- For testnet: Sepolia ETH for gas fees

### 1. Smart Contracts Setup

```bash
cd fhevm-hardhat-template

# Install dependencies
npm install

# Set environment variables
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to local network
npx hardhat node
npx hardhat deploy --network localhost

# Or deploy to Sepolia testnet
npx hardhat deploy --network sepolia
```

### 2. Frontend Setup

```bash
cd nightpomodoro-frontend

# Install dependencies
npm install

# Development with local Hardhat node
npm run dev:mock

# Development with Sepolia testnet
npm run dev

# Build for production
npm run build
```

## 🏗️ Architecture

### Smart Contracts

- **PomodoroCore**: Main contract storing encrypted user statistics
  - Encrypted fields: `totalFocusTime`, `totalInterruptCount`, `todayFocusTime`, `dailyTarget`
  - Functions: `initializeUser()`, `recordSession()`, `updateDailyTarget()`, `reauthorizeHandles()`
  
- **PomodoroNFT**: ERC-721 contract for achievement badges
  - Minted automatically when milestones are reached

### Frontend

- **FHEVM Integration**: Dual-mode support
  - Mock mode: Local development with `@fhevm/mock-utils`
  - Production mode: Real Relayer SDK via CDN
  
- **Wallet Management**: EIP-6963 discovery with silent reconnect
- **Encryption/Decryption**: Browser-based using wallet signatures
- **Static Export**: Fully static Next.js export for easy deployment

## 🔐 Privacy & Security

- All user data is encrypted using FHEVM before being stored on-chain
- Decryption happens entirely in the browser using EIP-712 signatures
- No server-side processing of sensitive data
- Wallet signatures are required for all decryption operations

## 📝 Available Scripts

### Smart Contracts

```bash
npm run compile      # Compile contracts
npm run test         # Run tests
npm run coverage     # Generate coverage
npm run lint         # Lint code
```

### Frontend

```bash
npm run dev:mock     # Dev with local Hardhat + Mock FHEVM
npm run dev          # Dev with Relayer SDK
npm run build        # Build static export
npm run check:static # Validate static export
```

## 🌍 Deployment

### Contracts (Sepolia)

```bash
cd fhevm-hardhat-template
npx hardhat deploy --network sepolia
```

### Frontend (Vercel)

The frontend is configured for static export and can be deployed to any static hosting service:

```bash
cd nightpomodoro-frontend
npm run build
# Deploy the 'out/' directory
```

## 📚 Documentation

- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [FHEVM Hardhat Guide](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup)
- [Next.js Documentation](https://nextjs.org/docs)

## 🧪 Testing

### Contract Tests

```bash
cd fhevm-hardhat-template
npm run test
```

### Frontend Testing

The frontend uses static export, so testing is primarily manual:
1. Start local Hardhat node
2. Deploy contracts
3. Run `npm run dev:mock`
4. Test in browser

## 📄 License

MIT

## 🙏 Acknowledgments

- Built with [FHEVM](https://github.com/zama-ai/fhevm) by Zama
- Smart contract template based on [fhevm-hardhat-template](https://github.com/zama-ai/fhevm-hardhat-template)

---

**Built with ❤️ for privacy-focused productivity**


