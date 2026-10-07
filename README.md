# SolidityAPIPlus

SolidityAPIPlus is the browser console for [SolidityStackDiamond](https://github.com/centxyz/SolidityStackDiamond). It sends Solidity source to a real compiler service, supports immediate and queued compilation, displays compiler diagnostics, and lets users inspect or download ABI, creation bytecode, deployed bytecode, and compiler metadata.

## Capabilities

- Connection and compiler-version health checks
- Safe filename, contract-name, source, and optimizer validation
- Synchronous `POST /api/compile` workflow
- Asynchronous `POST /api/jobs` submission and terminal-state polling
- Error and warning diagnostics from `solc`
- Multiple compiled-contract tabs
- ABI, creation/runtime bytecode, and metadata viewers
- Portable JSON artifact downloads with source hash and compiler settings

## Run the stack

Start the compiler API:

```bash
git clone https://github.com/centxyz/SolidityStackDiamond.git
cd SolidityStackDiamond
npm install
npm start
```

Then run this console:

```bash
git clone https://github.com/centxyz/SolidityAPIPlus.git
cd SolidityAPIPlus
npm install
npm run dev
```

The default API URL is `http://localhost:3000`. Enter another HTTP(S) service URL in the console when SolidityStackDiamond runs elsewhere. Configure that service's CORS policy for the console's origin.

## Verify

```bash
npm test
npm run build
```

Tests cover URL and compile-input validation, successful/error API responses, queued job polling, and artifact bundling.

SolidityAPIPlus compiles only. It never accepts private keys, deploys contracts, or signs transactions.

## License

MIT © cent
