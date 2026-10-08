set -euo pipefail

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ZeroLeak — Fabric Network Status                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

FABRIC_CONTAINERS=$(docker ps --filter "network=fabric_test" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || true)

if [ -z "${FABRIC_CONTAINERS}" ]; then
    echo "⚠️   No Fabric containers are currently running."
    echo "    Run 'npm run fabric:up' to start the network."
else
    echo "Running Fabric containers:"
    echo ""
    echo "${FABRIC_CONTAINERS}"
fi

echo ""

# Check LEDGER_HEIGHT via peer CLI if fabric-samples is available
FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-${HOME}/fabric-samples}"
PEER_BIN="${FABRIC_SAMPLES_PATH}/bin/peer"
CHANNEL_NAME="zeroleak-channel"
CHAINCODE_NAME="zeroleak"

if [ -f "${PEER_BIN}" ]; then
    echo "Querying ledger height from chaincode..."
    export PATH="${FABRIC_SAMPLES_PATH}/bin:${PATH}"
    export FABRIC_CFG_PATH="${FABRIC_SAMPLES_PATH}/config"
    export CORE_PEER_TLS_ENABLED=true
    export CORE_PEER_LOCALMSPID=Org1MSP
    export CORE_PEER_TLS_ROOTCERT_FILE="${FABRIC_SAMPLES_PATH}/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
    export CORE_PEER_MSPCONFIGPATH="${FABRIC_SAMPLES_PATH}/test-network/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp"
    export CORE_PEER_ADDRESS=localhost:7051

    "${PEER_BIN}" chaincode query \
        -C "${CHANNEL_NAME}" \
        -n "${CHAINCODE_NAME}" \
        -c '{"function":"GetLedgerHeight","Args":[]}' 2>/dev/null || echo "⚠️   Could not query chaincode (network may be down or chaincode not deployed)."
fi

echo ""
