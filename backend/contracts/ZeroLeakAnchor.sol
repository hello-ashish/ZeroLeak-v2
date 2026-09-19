// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ZeroLeakAnchor
 * @dev Public anchor contract to store cryptographic checkpoints of the ZeroLeak private permissioned blockchain.
 * Deployed on Polygon Amoy testnet.
 */
contract ZeroLeakAnchor {

    struct Checkpoint {
        uint256 sequence;
        uint256 privateLedgerHeight;
        string privateLedgerHash;
        string commitmentRoot;
        uint256 timestamp;
    }

    address public owner;
    uint256 public latestSequence;
    
    mapping(uint256 => Checkpoint) public checkpoints;

    event AnchorCommitted(
        uint256 indexed sequence,
        uint256 privateLedgerHeight,
        string privateLedgerHash,
        string commitmentRoot,
        uint256 timestamp
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the authorized relayer can anchor checkpoints.");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Commits a new checkpoint from the private ledger.
     */
    function anchorCheckpoint(
        uint256 _sequence,
        uint256 _privateLedgerHeight,
        string memory _privateLedgerHash,
        string memory _commitmentRoot
    ) external onlyOwner {
        require(_sequence > latestSequence, "Checkpoint sequence must be monotonically increasing.");

        checkpoints[_sequence] = Checkpoint({
            sequence: _sequence,
            privateLedgerHeight: _privateLedgerHeight,
            privateLedgerHash: _privateLedgerHash,
            commitmentRoot: _commitmentRoot,
            timestamp: block.timestamp
        });

        latestSequence = _sequence;

        emit AnchorCommitted(
            _sequence,
            _privateLedgerHeight,
            _privateLedgerHash,
            _commitmentRoot,
            block.timestamp
        );
    }

    /**
     * @dev Retrieves the latest checkpoint for independent verification.
     */
    function getLatestCheckpoint() external view returns (
        uint256 sequence,
        uint256 height,
        string memory ledgerHash,
        string memory root,
        uint256 timestamp
    ) {
        require(latestSequence > 0, "No checkpoints anchored yet.");
        Checkpoint memory cp = checkpoints[latestSequence];
        return (cp.sequence, cp.privateLedgerHeight, cp.privateLedgerHash, cp.commitmentRoot, cp.timestamp);
    }
}
