import { ethers } from "hardhat";
async function main() {
  const PYUSD_CONTRACT_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const MerklePyusdBank = await ethers.getContractFactory("MerklePyusdBank");
  const merklePyusdBank = await MerklePyusdBank.deploy(PYUSD_CONTRACT_ADDRESS);
  await merklePyusdBank.waitForDeployment();
  const deployedAddress = await merklePyusdBank.getAddress();
  const owner = await merklePyusdBank.owner();
  const pyusdTokenAddress = await merklePyusdBank.pyusdToken();
  const merkleRoot = await merklePyusdBank.merkleRoot();
}
main().catch((error) => {
  process.exitCode = 1;
});