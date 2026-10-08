set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZEROLEAK_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration
FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-/Users/helloashish/Desktop/fabric-learning/fabric-samples}"
TEST_NETWORK_PATH="${FABRIC_SAMPLES_PATH}/test-network"
CHANNEL_NAME="zeroleak-channel"
CA_FLAG="${FABRIC_USE_CA:-true}"   # Set to 'false' to use cryptogen instead of CA

# Preflight checks
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ZeroLeak — Hyperledger Fabric Test Network (DEV ONLY)      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -d "${TEST_NETWORK_PATH}" ]; then
    echo "❌  ERROR: Fabric test-network not found at: ${TEST_NETWORK_PATH}"
    echo ""
    echo "   Please install fabric-samples first:"
    echo "   curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.5"
    echo "   Or set FABRIC_SAMPLES_PATH=/path/to/your/fabric-samples"
    echo ""
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌  ERROR: Docker is not installed or not running."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌  ERROR: Docker daemon is not running."
    exit 1
fi

# ---------------------------------------------------------------------------
# Start the network
# ---------------------------------------------------------------------------
echo "📡  Starting Fabric test network..."
cd "${TEST_NETWORK_PATH}"

if [ "${CA_FLAG}" = "true" ]; then
    ./network.sh up -ca
else
    ./network.sh up
fi

echo ""
echo "📋  Creating channel: ${CHANNEL_NAME}"
./network.sh createChannel -c "${CHANNEL_NAME}"

echo ""
echo "✅  Fabric test network is UP"
echo "    Peer endpoint:     localhost:7051"
echo "    Channel:           ${CHANNEL_NAME}"
echo "    Org1 MSP:          Org1MSP"
echo "    Org2 MSP:          Org2MSP"
echo ""
echo "   Next step: run  npm run fabric:deploy  to deploy the ZeroLeak chaincode."
echo ""
