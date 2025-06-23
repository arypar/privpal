import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const PYUSD_CONTRACT_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
const PyusdDepositModule = buildModule("PyusdDepositModule", (m) => {
  const pyusdDeposit = m.contract("PyusdDeposit", [PYUSD_CONTRACT_ADDRESS]);
  return { pyusdDeposit };
});
export default PyusdDepositModule;