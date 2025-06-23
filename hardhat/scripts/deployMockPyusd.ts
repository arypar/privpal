import { ethers } from "hardhat";
async function main() {
  const [deployer] = await ethers.getSigners();
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockPyusd = await MockERC20.deploy("PayPal USD", "PYUSD", 6);
  await mockPyusd.waitForDeployment();
  const mockPyusdAddress = await mockPyusd.getAddress();
  const mintAmount = ethers.parseUnits("1000000", 6); 
  await mockPyusd.mint(deployer.address, mintAmount);
  return {
    mockPyusdAddress,
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