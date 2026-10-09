set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZEROLEAK_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-${ZEROLEAK_ROOT}/fabric/infrastructure}"
TEST_NETWORK_PATH="${FABRIC_SAMPLES_PATH}/test-network"

echo ""
echo "🛑  Stopping ZeroLeak Fabric test network..."

if [ ! -d "${TEST_NETWORK_PATH}" ]; then
    echo "❌  ERROR: Fabric test-network not found at: ${TEST_NETWORK_PATH}"
    exit 1
fi

cd "${TEST_NETWORK_PATH}"
./network.sh down

echo ""
echo "✅  Fabric test network stopped and volumes cleaned."
echo ""
