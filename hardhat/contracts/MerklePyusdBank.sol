// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract MerklePyusdBank {
    address public immutable pyusdToken;
    bytes32 public merkleRoot;
    address public owner;

    mapping(bytes32 => bool) public usedNullifiers;
    mapping(address => uint256) public totalDeposited;
    
    uint256 public totalBankBalance;

    event Deposited(address indexed user, uint256 amount);
    event RootUpdated(bytes32 newRoot);
    event Withdrawn(address indexed user, uint256 amount, uint256 nonce);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not the owner");
        _;
    }

    constructor(address _pyusdToken) {
        pyusdToken = _pyusdToken;
        owner = msg.sender;
    }

    /**
     * @notice Deposit PYUSD tokens into the bank
     * @param amount Amount of PYUSD tokens to deposit
     */
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(pyusdToken).balanceOf(msg.sender) >= amount, "Insufficient PYUSD balance");
        require(IERC20(pyusdToken).allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
        
        bool success = IERC20(pyusdToken).transferFrom(msg.sender, address(this), amount);
        require(success, "PYUSD transfer failed");
        
        totalDeposited[msg.sender] += amount;
        totalBankBalance += amount;
        
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Update the Merkle root (owner only)
     * @param newRoot New Merkle root hash
     */
    function updateRoot(bytes32 newRoot) external onlyOwner {
        require(newRoot != bytes32(0), "Root cannot be zero");
        merkleRoot = newRoot;
        emit RootUpdated(newRoot);
    }

    /**
     * @notice Withdraw PYUSD tokens using Merkle proof for privacy
     * @param amount Amount to withdraw
     * @param nonce Unique nonce for this withdrawal
     * @param merkleProof Merkle proof array
     * @param leaf Leaf hash for verification
     */
    function withdraw(
        uint256 amount,
        uint256 nonce,
        bytes32[] calldata merkleProof,
        bytes32 leaf
    ) external {
        require(amount > 0, "Amount must be > 0");
        require(merkleRoot != bytes32(0), "Merkle root not set");
        require(IERC20(pyusdToken).balanceOf(address(this)) >= amount, "Insufficient bank balance");
        
        bytes32 nullifier = keccak256(abi.encodePacked(msg.sender, nonce));
        require(!usedNullifiers[nullifier], "Already spent");
        require(validateLeaf(leaf, amount, nonce), "Leaf doesn't match sender");
        require(verifyMerkleProof(merkleProof, merkleRoot, leaf), "Invalid Merkle proof");

        usedNullifiers[nullifier] = true;
        totalBankBalance -= amount;

        bool success = IERC20(pyusdToken).transfer(msg.sender, amount);
        require(success, "PYUSD transfer failed");

        emit Withdrawn(msg.sender, amount, nonce);
    }

    /**
     * @notice Validate that a leaf matches the expected format
     * @param leaf Leaf hash to validate
     * @param amount Amount in the leaf
     * @param nonce Nonce in the leaf
     * @return bool True if leaf is valid
     */
    function validateLeaf(bytes32 leaf, uint256 amount, uint256 nonce) public view returns (bool) {
        bytes32 expectedLeaf = keccak256(abi.encodePacked(msg.sender, amount, nonce));
        return leaf == expectedLeaf;
    }

    /**
     * @notice Verify a Merkle proof
     * @param proof Array of proof hashes
     * @param root Merkle root to verify against
     * @param leaf Leaf to verify
     * @return bool True if proof is valid
     */
    function verifyMerkleProof(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];
            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == root;
    }

    /**
     * @notice Get the total deposited amount for a user
     * @param user Address of the user
     * @return uint256 Total amount deposited by the user
     */
    function getUserTotalDeposited(address user) external view returns (uint256) {
        return totalDeposited[user];
    }

    /**
     * @notice Get the current PYUSD balance of the contract
     * @return uint256 Contract's PYUSD balance
     */
    function getContractBalance() external view returns (uint256) {
        return IERC20(pyusdToken).balanceOf(address(this));
    }

    /**
     * @notice Check if a nullifier has been used
     * @param user Address of the user
     * @param nonce Nonce to check
     * @return bool True if nullifier has been used
     */
    function isNullifierUsed(address user, uint256 nonce) external view returns (bool) {
        bytes32 nullifier = keccak256(abi.encodePacked(user, nonce));
        return usedNullifiers[nullifier];
    }

    /**
     * @notice Generate a leaf hash for given parameters
     * @param user Address of the user
     * @param amount Amount for the leaf
     * @param nonce Nonce for the leaf
     * @return bytes32 Generated leaf hash
     */
    function generateLeaf(address user, uint256 amount, uint256 nonce) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, amount, nonce));
    }

    /**
     * @notice Transfer ownership of the contract
     * @param newOwner Address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /**
     * @notice Emergency withdrawal function (owner only)
     * @param amount Amount to withdraw
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(pyusdToken).balanceOf(address(this)) >= amount, "Insufficient balance");
        
        bool success = IERC20(pyusdToken).transfer(owner, amount);
        require(success, "Emergency withdrawal failed");
        
        totalBankBalance = totalBankBalance > amount ? totalBankBalance - amount : 0;
    }
} 