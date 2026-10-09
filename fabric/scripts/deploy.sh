set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZEROLEAK_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CHAINCODE_DIR="${ZEROLEAK_ROOT}/fabric/chaincode/zeroleak-integrity"

FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-${ZEROLEAK_ROOT}/fabric/infrastructure}"
TEST_NETWORK_PATH="${FABRIC_SAMPLES_PATH}/test-network"
CHANNEL_NAME="zeroleak-channel"
CHAINCODE_NAME="zeroleak"
CHAINCODE_VERSION="${CHAINCODE_VERSION:-1.0}"
CHAINCODE_SEQUENCE="${CHAINCODE_SEQUENCE:-1}"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ZeroLeak — Deploying chaincode to ${CHANNEL_NAME}          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 1. Build the TypeScript chaincode
echo "🔨  Building TypeScript chaincode..."
cd "${CHAINCODE_DIR}"
npm install
npm run build
echo "✅  Chaincode built successfully."
echo ""

# 2. Deploy using test-network deployCC
echo "✅ Deploying chaincode '${CHAINCODE_NAME}' to '${CHANNEL_NAME}'..."
cd "${TEST_NETWORK_PATH}"

./network.sh deployCC \
    -ccn "${CHAINCODE_NAME}" \
    -ccp "${CHAINCODE_DIR}" \
    -ccl javascript \
    -c "${CHANNEL_NAME}" \
    -ccv "${CHAINCODE_VERSION}" \
    -ccs "${CHAINCODE_SEQUENCE}"

echo ""
echo "✅  Chaincode '${CHAINCODE_NAME}' v${CHAINCODE_VERSION} deployed to '${CHANNEL_NAME}'."
echo ""
echo "   You can now start the ZeroLeak backend with:"
echo "   FABRIC_ENABLED=true npm run dev"
echo ""
