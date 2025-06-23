# PYUSD Deposit Contract

This contract allows users to deposit and withdraw PYUSD tokens in a secure manner.

## Contract Overview

The `PyusdDeposit` contract is designed to interact with the PYUSD token contract at address `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`. It provides the following functionality:

- **Deposit PYUSD**: Users can deposit PYUSD tokens into the contract
- **Withdraw PYUSD**: Users can withdraw their deposited PYUSD tokens
- **View Functions**: Check deposit balances, timestamps, and contract state
- **Emergency Functions**: Owner-only functions for emergency situations

## Key Features

### User Functions

1. **`depositPyusd(uint256 amount)`**
   - Allows users to deposit PYUSD tokens
   - Requires prior approval of the contract to spend user's PYUSD tokens
   - Emits a `Deposit` event
   - Updates user's deposit balance and timestamp

2. **`withdrawPyusd(uint256 amount)`**
   - Allows users to withdraw their deposited PYUSD tokens
   - Can only withdraw up to their current deposit balance
   - Emits a `Withdrawal` event

3. **View Functions**
   - `getDepositBalance(address user)`: Returns user's current deposit balance
   - `getDepositTimestamp(address user)`: Returns timestamp of user's last deposit
   - `getContractBalance()`: Returns total PYUSD balance held by the contract

### Owner Functions

1. **`emergencyWithdraw(address user, uint256 amount)`**
   - Owner-only function to withdraw funds for a user in emergency situations
   - Emits an `EmergencyWithdrawal` event

2. **`transferOwnership(address newOwner)`**
   - Allows the current owner to transfer ownership to a new address

## Usage Examples

### Depositing PYUSD

```solidity
// First, approve the deposit contract to spend your PYUSD
IERC20 pyusd = IERC20(0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9);
pyusd.approve(pyusdDepositAddress, amount);

// Then deposit
PyusdDeposit pyusdDeposit = PyusdDeposit(pyusdDepositAddress);
pyusdDeposit.depositPyusd(amount);
```

### Withdrawing PYUSD

```solidity
PyusdDeposit pyusdDeposit = PyusdDeposit(pyusdDepositAddress);
pyusdDeposit.withdrawPyusd(amount);
```

### Checking Balance

```solidity
PyusdDeposit pyusdDeposit = PyusdDeposit(pyusdDepositAddress);
uint256 balance = pyusdDeposit.getDepositBalance(userAddress);
```

## Deployment

### Local Deployment

```bash
npx hardhat run scripts/deploy.ts
```

### Network Deployment

```bash
npx hardhat run scripts/deploy.ts --network [network-name]
```

### Using Hardhat Ignition

```bash
npx hardhat ignition deploy ignition/modules/PyusdDeposit.ts
```

## Testing

Run the comprehensive test suite:

```bash
npx hardhat test test/PyusdDeposit.ts
```

## Security Features

- **Access Control**: Owner-only functions for emergency operations
- **Input Validation**: All functions validate inputs and check balances
- **Safe Transfers**: Uses standard ERC20 transfer functions with return value checks
- **Event Logging**: All major operations emit events for transparency

## Contract Addresses

- **PYUSD Token**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **PyusdDeposit Contract**: Will be generated upon deployment

## Important Notes

1. **Approval Required**: Users must first approve the PyusdDeposit contract to spend their PYUSD tokens before depositing
2. **Owner Responsibilities**: The contract owner has emergency withdrawal capabilities and should be a trusted entity
3. **Gas Considerations**: All operations require gas fees on the Ethereum network
4. **PYUSD Decimals**: PYUSD uses 6 decimal places, so 1 PYUSD = 1,000,000 units

## Events

- `Deposit(address indexed user, uint256 amount, uint256 timestamp)`
- `Withdrawal(address indexed user, uint256 amount, uint256 timestamp)`
- `EmergencyWithdrawal(address indexed user, uint256 amount)`

## Error Messages

- "Amount must be greater than 0"
- "Insufficient PYUSD balance"
- "Insufficient allowance"
- "Transfer failed"
- "Insufficient deposit balance"
- "Not the owner"
- "New owner cannot be zero address" 