#!/usr/bin/env node

/**
 * Check if Hardhat node is running on localhost:8545
 * Similar to frontend/scripts/is-hardhat-node-running.mjs
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const http = require("http");

const HARDHAT_RPC_URL = "http://localhost:8545";

function checkHardhatNode() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_chainId",
      params: [],
      id: 1,
    });

    const options = {
      hostname: "localhost",
      port: 8545,
      path: "/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const response = JSON.parse(data);
          const chainId = parseInt(response.result, 16);
          if (chainId === 31337) {
            console.log("✓ Hardhat node is running (chainId: 31337)");
            resolve(true);
          } else {
            console.error(`✗ Wrong chainId: ${chainId} (expected 31337)`);
            resolve(false);
          }
        } catch (error) {
          console.error("✗ Invalid response from node:", error.message);
          resolve(false);
        }
      });
    });

    req.on("error", (error) => {
      console.error("✗ Hardhat node not running on localhost:8545");
      console.error("  Please start it with: cd fhevm-hardhat-template && npx hardhat node");
      resolve(false);
    });

    req.on("timeout", () => {
      console.error("✗ Connection timeout to localhost:8545");
      req.destroy();
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// Run check
checkHardhatNode().then((isRunning) => {
  if (!isRunning) {
    process.exit(1);
  }
});

