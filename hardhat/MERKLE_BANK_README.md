# MerklePyusdBank - Anonymous Banking Contract

A privacy-preserving banking contract that allows users to deposit PYUSD tokens publicly and withdraw them anonymously using Merkle proofs and nullifiers.

## Contract Overview

The `MerklePyusdBank` contract implements a privacy-focused banking system where:
- **Public Deposits**: Users can deposit PYUSD tokens publicly (deposit amounts and addresses are visible)
- **Anonymous Withdrawals**: Users can withdraw tokens anonymously using Merkle proofs
- **Double-Spend Prevention**: Nullifiers prevent the same withdrawal proof from being used twice
- **Owner-Controlled Privacy**: The contract owner manages the Merkle root for withdrawal authorization

## Key Features

### 🔒 Privacy-Preserving Withdrawals
- Withdrawals use Merkle proofs to verify authorization without revealing the withdrawal tree structure
- Nullifiers ensure each withdrawal can only be used once
- No direct link between deposits and withdrawals

### 🛡️ Security Features
- Owner-only Merkle root management
- Nullifier-based double-spend prevention
- Comprehensive input validation
- Emergency withdrawal capabilities

### 📊 Transparency
- Public deposit tracking
- Event emission for all major operations
- View functions for balance checking

## Contract Functions

### User Functions

#### `deposit(uint256 amount)`
Deposits PYUSD tokens into the bank.
- **Requirements**: User must approve the contract to spend PYUSD first
- **Events**: Emits `Deposited(user, amount)`
- **Visibility**: Public (deposit amounts and addresses are visible on-chain)

#### `withdraw(uint256 amount, uint256 nonce, bytes32[] merkleProof, bytes32 leaf)`
Withdraws PYUSD tokens anonymously using a Merkle proof.
- **Requirements**: 
  - Valid Merkle proof against current root
  - Unused nullifier (user + nonce combination)
  - Valid leaf hash
  - Sufficient contract balance
- **Events**: Emits `Withdrawn(user, amount, nonce)`
- **Privacy**: Withdrawal authorization is private via Merkle proofs

### Owner Functions

#### `updateRoot(bytes32 newRoot)`
Updates the Merkle root for withdrawal authorization.
- **Access**: Owner only
- **Purpose**: Authorizes new sets of withdrawals
- **Events**: Emits `RootUpdated(newRoot)`

#### `emergencyWithdraw(uint256 amount)`
Emergency withdrawal function for the contract owner.
- **Access**: Owner only
- **Purpose**: Emergency fund recovery
- **Safety**: Updates internal balance tracking

#### `transferOwnership(address newOwner)`
Transfers contract ownership to a new address.
- **Access**: Owner only
- **Events**: Emits `OwnershipTransferred(previousOwner, newOwner)`

### View Functions

#### `getUserTotalDeposited(address user)`
Returns the total amount deposited by a specific user.

#### `getContractBalance()`
Returns the current PYUSD balance of the contract.

#### `isNullifierUsed(address user, uint256 nonce)`
Checks if a specific nullifier (user + nonce) has been used.

#### `generateLeaf(address user, uint256 amount, uint256 nonce)`
Generates a leaf hash for the given parameters (useful for creating Merkle trees).

#### `validateLeaf(bytes32 leaf, uint256 amount, uint256 nonce)`
Validates that a leaf hash matches the expected format for the calling user.

#### `verifyMerkleProof(bytes32[] proof, bytes32 root, bytes32 leaf)`
Verifies a Merkle proof against a given root and leaf.

## Privacy Model

### How It Works

1. **Deposit Phase**: Users deposit PYUSD tokens publicly
2. **Authorization Phase**: Contract owner creates a Merkle tree of authorized withdrawals and updates the root
3. **Withdrawal Phase**: Users withdraw anonymously by providing:
   - The amount to withdraw
   - A unique nonce
   - A Merkle proof proving their withdrawal is authorized
   - The leaf hash

### Merkle Tree Structure

Each leaf in the Merkle tree represents an authorized withdrawal:
```
Leaf = keccak256(abi.encodePacked(userAddress, amount, nonce))
```

### Privacy Properties

- **Withdrawal Anonymity**: The Merkle proof doesn't reveal which specific leaf is being claimed
- **Amount Privacy**: Withdrawal amounts are only visible to those who know the tree structure
- **Unlinkability**: No direct link between deposits and withdrawals on-chain

## Usage Examples

### Depositing PYUSD

```javascript
// 1. Approve the contract
await pyusdToken.approve(merkleBankAddress, amount);

// 2. Deposit
await merkleBank.deposit(amount);
```

### Creating Withdrawal Authorization (Owner)

```javascript
// Off-chain: Create Merkle tree of authorized withdrawals
const leaves = [
  generateLeaf(user1Address, amount1, nonce1),
  generateLeaf(user2Address, amount2, nonce2),
  // ... more authorized withdrawals
];

const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
const root = tree.getRoot();

// On-chain: Update root
await merkleBank.updateRoot(root);
```

### Anonymous Withdrawal

```javascript
// Off-chain: Generate proof
const leaf = generateLeaf(userAddress, amount, nonce);
const proof = tree.getProof(leaf);

// On-chain: Withdraw
await merkleBank.withdraw(amount, nonce, proof, leaf);
```

## Deployment

### Local Deployment
```bash
npx hardhat run scripts/deployMerkleBank.ts
```

### Network Deployment
```bash
npx hardhat run scripts/deployMerkleBank.ts --network [network-name]
```

### Using Hardhat Ignition
```bash
npx hardhat ignition deploy ignition/modules/MerklePyusdBank.ts
```

## Testing

Run the comprehensive test suite:
```bash
npx hardhat test test/MerklePyusdBank.ts
```

## Security Considerations

### ⚠️ Important Notes

1. **Owner Trust**: The contract owner controls withdrawal authorization via Merkle root updates
2. **Nullifier Management**: Users must track their nonces to avoid conflicts
3. **Proof Storage**: Users must store their Merkle proofs off-chain
4. **Tree Construction**: The withdrawal authorization tree must be constructed carefully off-chain

### Best Practices

1. **Nonce Management**: Use timestamps or sequential numbers for nonces
2. **Proof Backup**: Store Merkle proofs securely off-chain
3. **Root Verification**: Verify Merkle roots are constructed correctly
4. **Owner Security**: Use multi-sig or timelock for owner functions

## Events

```solidity
event Deposited(address indexed user, uint256 amount);
event RootUpdated(bytes32 newRoot);
event Withdrawn(address indexed user, uint256 amount, uint256 nonce);
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

## Contract Addresses

- **PYUSD Token**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **MerklePyusdBank Contract**: Will be generated upon deployment

## Technical Details

- **Solidity Version**: ^0.8.27
- **PYUSD Decimals**: 6
- **Nullifier Format**: `keccak256(abi.encodePacked(userAddress, nonce))`
- **Leaf Format**: `keccak256(abi.encodePacked(userAddress, amount, nonce))`

## Integration with Frontend

The contract is designed to work with:
- Web3 wallets (MetaMask, WalletConnect, etc.)
- Merkle tree libraries (merkletreejs)
- IPFS for storing withdrawal authorization data
- Zero-knowledge proof systems (for enhanced privacy) 