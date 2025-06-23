import { ethers } from "hardhat";
import { PyusdDeposit } from "../typechain-types";
async function main() {
  const [deployer] = await ethers.getSigners();
  const PYUSD_TOKEN_ADDRESS = process.env.PYUSD_TOKEN_ADDRESS || "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
  const PyusdDeposit = await ethers.getContractFactory("PyusdDeposit");
  const pyusdDeposit = await PyusdDeposit.deploy(PYUSD_TOKEN_ADDRESS);
  await pyusdDeposit.waitForDeployment();
  const contractAddress = await pyusdDeposit.getAddress();
  const owner = await pyusdDeposit.owner();
  return {
    contractAddress,
    pyusdTokenAddress: PYUSD_TOKEN_ADDRESS,
    owner: owner,
    deployer: deployer.address
  };
}
main()
  .then((result) => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });