import { ethers } from "ethers";
import fs from "fs";
import path from "path";

// An RPC(Remote Procedure Call) node is a specialized server that bridges the gap between decentralized apps (dApps) or wallets and a blockchain network.
const RPC_URL = process.env.PUBLIC_CHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
const PRIVATE_KEY = process.env.ANCHOR_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"; // Default mock key for dev
const CONTRACT_ADDRESS = process.env.ANCHOR_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000";

let provider;
let wallet;
let contract;

// Mock ABI for the anchor contract (Application Binary Interface)
const abi = [
    "function anchorCheckpoint(uint256 sequence, uint256 height, string ledgerHash, string root) external",
    "function getLatestCheckpoint() external view returns (uint256 sequence, uint256 height, string ledgerHash, string root, uint256 timestamp)"
];

// Fallback logic for when there is no real Polygon connection
const MOCK_ANCHOR_DB = {
    sequence: 0,
    height: 0,
    ledgerHash: "",
    root: "",
    timestamp: 0,
    txHash: ""
};

export async function submitPolygonAnchor(sequence, height, ledgerHash, root) {
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        console.log(`[PolygonAnchor Mock] Anchoring checkpoint seq=${sequence}, height=${height}`);
        MOCK_ANCHOR_DB.sequence = sequence;
        MOCK_ANCHOR_DB.height = height;
        MOCK_ANCHOR_DB.ledgerHash = ledgerHash;
        MOCK_ANCHOR_DB.root = root;
        MOCK_ANCHOR_DB.timestamp = Date.now();
        MOCK_ANCHOR_DB.txHash = `0xmocktx${Date.now()}`;
        return MOCK_ANCHOR_DB.txHash;
    }

    if (!provider) {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);
    }

    try {
        const tx = await contract.anchorCheckpoint(sequence, height, ledgerHash, root);
        await tx.wait(1); // Wait for 1 confirmation
        return tx.hash;
    } catch (error) {
        console.error("[PolygonAnchor] Failed to anchor on Polygon:", error);
        throw error;
    }
}

export async function getPolygonAnchor() {
    if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
        return MOCK_ANCHOR_DB;
    }

    if (!provider) {
        provider = new ethers.JsonRpcProvider(RPC_URL);
        contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    }

    try {
        const result = await contract.getLatestCheckpoint();
        return {
            sequence: Number(result.sequence),
            height: Number(result.height),
            ledgerHash: result.ledgerHash,
            root: result.root,
            timestamp: Number(result.timestamp) * 1000,
        };
    } catch (error) {
        console.error("[PolygonAnchor] Failed to fetch anchor:", error);
        return null;
    }
}
