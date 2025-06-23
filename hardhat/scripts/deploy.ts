import { ethers } from "hardhat";
async function main() {
  const PYUSD_CONTRACT_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const PyusdDeposit = await ethers.getContractFactory("PyusdDeposit");
  const pyusdDeposit = await PyusdDeposit.deploy(PYUSD_CONTRACT_ADDRESS);
  await pyusdDeposit.waitForDeployment();
  const deployedAddress = await pyusdDeposit.getAddress();
  const owner = await pyusdDeposit.owner();
  const pyusdTokenAddress = await pyusdDeposit.pyusdToken();
}
main().catch((error) => {
  process.exitCode = 1;
});