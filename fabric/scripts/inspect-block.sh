#!/usr/bin/env bash
set -euo pipefail

BLOCK_NUM="${1:-newest}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZEROLEAK_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

OUTPUT_DIR="${ZEROLEAK_ROOT}/block-inspect"
mkdir -p "${OUTPUT_DIR}"

OUTPUT_JSON="${OUTPUT_DIR}/block_${BLOCK_NUM}.json"
TMP_PB="${OUTPUT_DIR}/.block_${BLOCK_NUM}.pb"

FABRIC_SAMPLES_PATH="${FABRIC_SAMPLES_PATH:-${HOME}/Desktop/fabric-learning/fabric-samples}"
if [ ! -d "${FABRIC_SAMPLES_PATH}" ]; then
    FABRIC_SAMPLES_PATH="${HOME}/fabric-samples"
fi

if [ ! -d "${FABRIC_SAMPLES_PATH}" ]; then
    echo "❌ fabric-samples directory not found."
    exit 1
fi

export PATH="${FABRIC_SAMPLES_PATH}/bin:${PATH}"
export FABRIC_CFG_PATH="${FABRIC_SAMPLES_PATH}/config"
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE="${FABRIC_SAMPLES_PATH}/test-network/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
export CORE_PEER_MSPCONFIGPATH="${FABRIC_SAMPLES_PATH}/test-network/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp"
export CORE_PEER_ADDRESS="localhost:7051"

ORDERER_CA="${FABRIC_SAMPLES_PATH}/test-network/organizations/ordererOrganizations/example.com/tlsca/tlsca.example.com-cert.pem"

echo "📦 Fetching block '${BLOCK_NUM}' from zeroleak-channel..."
peer channel fetch "${BLOCK_NUM}" "${TMP_PB}" \
    -c zeroleak-channel \
    -o localhost:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile "${ORDERER_CA}" >/dev/null 2>&1

echo "🔍 Decoding block to JSON..."
configtxlator proto_decode --input "${TMP_PB}" --type common.Block --output "${OUTPUT_JSON}"
rm -f "${TMP_PB}"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  BLOCK SUMMARY: ${BLOCK_NUM}"
echo "════════════════════════════════════════════════════════════════"
python3 -c "
import json
with open('${OUTPUT_JSON}') as f:
    d = json.load(f)
h = d.get('header', {})
print(f'Block Number : {h.get(\"number\")}')
print(f'Previous Hash: {h.get(\"previous_hash\")}')
print(f'Data Hash    : {h.get(\"data_hash\")}')
data_entries = d.get('data', {}).get('data', [])
print(f'Transactions : {len(data_entries)}')
raw_text = json.dumps(d)
import re
commitments = set(re.findall(r'(?:result|exam|question|securityevent)_[a-f0-9]+_v\d+', raw_text))
if commitments:
    print('Commitment IDs found in block:')
    for c in commitments:
        print(f'  • {c}')
"
echo "════════════════════════════════════════════════════════════════"
echo "Decoded JSON saved to: block-inspect/block_${BLOCK_NUM}.json"
echo ""
