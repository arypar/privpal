import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
const PYUSD_CONTRACT_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
const MerklePyusdBankModule = buildModule("MerklePyusdBankModule", (m) => {
  const merklePyusdBank = m.contract("MerklePyusdBank", [PYUSD_CONTRACT_ADDRESS]);
  return { merklePyusdBank };
});
export default MerklePyusdBankModule;