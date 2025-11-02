# NightPomodoro Frontend

Private focus tracking dApp powered by FHEVM.

## Quick Start

### Prerequisites

1. Node.js 18+ installed
2. Hardhat contracts deployed (see `../fhevm-hardhat-template/`)

### Installation

```bash
npm install
```

### Development

#### Local Development (with Hardhat node)

1. Start Hardhat node in another terminal:
   ```bash
   cd ../fhevm-hardhat-template
   npx hardhat node
   ```

2. Deploy contracts:
   ```bash
   cd ../fhevm-hardhat-template
   npx hardhat deploy --network localhost
   ```

3. Start frontend:
   ```bash
   npm run dev:mock
   ```

#### Production Mode (Sepolia)

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

This will create a static export in the `out/` directory.

### Scripts

- `npm run dev:mock` - Development with local Hardhat + Mock FHEVM
- `npm run dev` - Development with Relayer SDK (production networks)
- `npm run build` - Build static export
- `npm run check:static` - Validate static export compatibility

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # Dashboard
│   ├── focus/             # Focus timer
│   ├── weekly/            # Weekly stats
│   ├── badges/            # Achievement badges
│   └── settings/          # Settings
├── components/            # React components
├── fhevm/                 # FHEVM integration
│   └── internal/          # Internal FHEVM logic
│       ├── fhevm.ts       # Main FHEVM interface
│       ├── RelayerSDKLoader.ts  # Relayer SDK loader
│       └── mock/          # Mock utilities
├── hooks/                 # React hooks
│   ├── useWallet.ts       # Wallet connection (EIP-6963)
│   ├── useContract.ts     # Contract interaction
│   ├── useFocusSession.ts # Pomodoro timer
│   └── useDecryption.ts   # Decryption helper
├── utils/                 # Utilities
│   ├── network.ts         # Network configuration
│   ├── storage.ts         # LocalStorage helpers
│   └── design-tokens.ts   # Design system
├── scripts/               # Build scripts
│   ├── genabi.mjs         # ABI generation
│   ├── check-static.mjs   # Static export validation
│   └── is-hardhat-node-running.mjs
└── abi/                   # Generated ABIs (auto-generated)
```

## Features

- ✅ EIP-6963 wallet discovery
- ✅ Silent reconnect on page refresh
- ✅ FHEVM encryption/decryption
- ✅ Dual mode: Mock (local) + Relayer (production)
- ✅ Static export compatible
- ✅ Full accessibility (WCAG AA)
- ✅ Responsive design

## Privacy

All user data (focus time, interrupts, distraction tags) are encrypted using FHEVM before being stored on-chain. Decryption happens entirely in the browser using your wallet signature. No one else can see your personal statistics.

## License

MIT

