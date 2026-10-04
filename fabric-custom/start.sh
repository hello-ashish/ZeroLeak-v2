#!/bin/bash
set -ex

echo "Cleaning up old data..."
docker compose down -v
rm -rf crypto-config channel-artifacts
mkdir channel-artifacts

echo "Generating crypto material..."
docker run --rm -v $(pwd):/data -w /data hyperledger/fabric-tools:2.5.9 cryptogen generate --config=./crypto-config.yaml

echo "Generating genesis block (No System Channel)..."
docker run --rm -v $(pwd):/data -w /data -e FABRIC_CFG_PATH=/data hyperledger/fabric-tools:2.5.9 configtxgen -profile TwoOrgsApplicationGenesis -outputBlock ./channel-artifacts/mychannel.block -channelID mychannel

echo "Starting network..."
docker compose up -d

echo "Waiting for nodes to start..."
sleep 5

echo "Joining Orderer to the channel..."
# In Fabric 2.5, orderers join channels via osnadmin.
docker exec orderer.example.com osnadmin channel join --channelID mychannel --config-block /var/hyperledger/orderer/mychannel.block -o localhost:7053 --ca-file /var/hyperledger/orderer/tls/ca.crt --client-cert /var/hyperledger/orderer/tls/server.crt --client-key /var/hyperledger/orderer/tls/server.key

echo "Joining Peer to the channel..."
docker exec cli peer channel join -b /opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/mychannel.block

echo "Installing Node.js dependencies for chaincode..."
# We need to install npm dependencies in the chaincode folder before packaging
cd ../backend/chaincode
npm install
cd ../../fabric-custom

echo "Packaging chaincode..."
docker exec cli peer lifecycle chaincode package integrityContract.tar.gz --path /opt/gopath/src/github.com/chaincode --lang node --label integrityContract_1.0

echo "Installing chaincode on peer..."
docker exec cli peer lifecycle chaincode install integrityContract.tar.gz

echo "Querying installed chaincode to get Package ID..."
PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "Package ID: integrityContract_1.0" | sed -n 's/^Package ID: //; s/, Label:.*$//p')
echo "Package ID is $PACKAGE_ID"

echo "Approving chaincode for Org1..."
docker exec cli peer lifecycle chaincode approveformyorg -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name integrityContract --version 1.0 --package-id $PACKAGE_ID --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem

echo "Committing chaincode..."
docker exec cli peer lifecycle chaincode commit -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name integrityContract --version 1.0 --sequence 1 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt

echo "Initializing chaincode..."
sleep 3
docker exec cli peer chaincode invoke -o orderer.example.com:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C mychannel -n integrityContract --peerAddresses peer0.org1.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt -c '{"function":"initLedger","Args":[]}'

echo "Network is up and chaincode is deployed!"
