import {
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
describe("PyusdDeposit", function () {
  async function deployPyusdDepositFixture() {
    const [owner, otherAccount] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockPyusd = await MockERC20.deploy("PayPal USD", "PYUSD", 6);
    const PyusdDeposit = await ethers.getContractFactory("PyusdDeposit");
    const pyusdDeposit = await PyusdDeposit.deploy(await mockPyusd.getAddress());
    await mockPyusd.mint(owner.address, ethers.parseUnits("1000", 6));
    await mockPyusd.mint(otherAccount.address, ethers.parseUnits("1000", 6));
    return { pyusdDeposit, mockPyusd, owner, otherAccount };
  }
  function createMerkleTree(leaves: Buffer[]): MerkleTree {
    return new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
  }
  function generateLeaf(user: string, amount: bigint, nonce: bigint): Buffer {
    const encoded = ethers.solidityPacked(["address", "uint256", "uint256"], [user, amount, nonce]);
    return Buffer.from(ethers.keccak256(encoded).slice(2), 'hex');
  }
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { pyusdDeposit, owner } = await loadFixture(deployPyusdDepositFixture);
      expect(await pyusdDeposit.owner()).to.equal(owner.address);
    });
    it("Should set the correct PYUSD token address", async function () {
      const { pyusdDeposit, mockPyusd } = await loadFixture(deployPyusdDepositFixture);
      expect(await pyusdDeposit.pyusdToken()).to.equal(await mockPyusd.getAddress());
    });
  });
  describe("Deposits", function () {
    it("Should allow users to deposit PYUSD", async function () {
      const { pyusdDeposit, mockPyusd, owner } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.approve(await pyusdDeposit.getAddress(), depositAmount);
      await expect(pyusdDeposit.depositPyusd(depositAmount))
        .to.emit(pyusdDeposit, "Deposit")
        .withArgs(owner.address, depositAmount, anyValue);
      expect(await pyusdDeposit.getContractBalance()).to.be.greaterThanOrEqual(depositAmount);
    });
    it("Should fail if user has insufficient PYUSD balance", async function () {
      const { pyusdDeposit, mockPyusd, otherAccount } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("2000", 6); 
      await mockPyusd.connect(otherAccount).approve(await pyusdDeposit.getAddress(), depositAmount);
      await expect(pyusdDeposit.connect(otherAccount).depositPyusd(depositAmount))
        .to.be.revertedWith("Insufficient PYUSD balance");
    });
    it("Should fail if user hasn't approved enough allowance", async function () {
      const { pyusdDeposit, mockPyusd, owner } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const approveAmount = ethers.parseUnits("50", 6);
      await mockPyusd.approve(await pyusdDeposit.getAddress(), approveAmount);
      await expect(pyusdDeposit.depositPyusd(depositAmount))
        .to.be.revertedWith("Insufficient allowance");
    });
    it("Should fail if deposit amount is zero", async function () {
      const { pyusdDeposit } = await loadFixture(deployPyusdDepositFixture);
      await expect(pyusdDeposit.depositPyusd(0))
        .to.be.revertedWith("Amount must be greater than 0");
    });
  });
  describe("Merkle Root Management", function () {
    it("Should allow owner to update merkle root", async function () {
      const { pyusdDeposit, owner } = await loadFixture(deployPyusdDepositFixture);
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("test root"));
      await expect(pyusdDeposit.connect(owner).updateRoot(newRoot))
        .to.emit(pyusdDeposit, "RootUpdated")
        .withArgs(newRoot);
      expect(await pyusdDeposit.merkleRoot()).to.equal(newRoot);
    });
    it("Should fail if non-owner tries to update merkle root", async function () {
      const { pyusdDeposit, otherAccount } = await loadFixture(deployPyusdDepositFixture);
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("test root"));
      await expect(pyusdDeposit.connect(otherAccount).updateRoot(newRoot))
        .to.be.revertedWith("Not the owner");
    });
    it("Should fail if trying to set zero root", async function () {
      const { pyusdDeposit, owner } = await loadFixture(deployPyusdDepositFixture);
      await expect(pyusdDeposit.connect(owner).updateRoot(ethers.ZeroHash))
        .to.be.revertedWith("Root cannot be zero");
    });
  });
  describe("Merkle Proof Withdrawals", function () {
    it("Should allow withdrawal with valid merkle proof", async function () {
      const { pyusdDeposit, mockPyusd, owner, otherAccount } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(otherAccount).approve(await pyusdDeposit.getAddress(), depositAmount);
      await pyusdDeposit.connect(otherAccount).depositPyusd(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(owner.address, withdrawAmount, nonce),
        generateLeaf(owner.address, ethers.parseUnits("25", 6), 2n), 
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(owner.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await pyusdDeposit.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await pyusdDeposit.generateLeaf(owner.address, withdrawAmount, nonce);
      await expect(pyusdDeposit.connect(owner).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.emit(pyusdDeposit, "Withdrawn")
        .withArgs(owner.address, withdrawAmount, nonce);
      expect(await pyusdDeposit.isNullifierUsed(owner.address, nonce)).to.be.true;
    });
    it("Should fail withdrawal with invalid merkle proof", async function () {
      const { pyusdDeposit, mockPyusd, owner, otherAccount } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(otherAccount).approve(await pyusdDeposit.getAddress(), depositAmount);
      await pyusdDeposit.connect(otherAccount).depositPyusd(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(otherAccount.address, withdrawAmount, nonce), 
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(otherAccount.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await pyusdDeposit.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await pyusdDeposit.generateLeaf(owner.address, withdrawAmount, nonce);
      await expect(pyusdDeposit.connect(owner).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.be.revertedWith("Invalid Merkle proof");
    });
    it("Should fail if nullifier already used", async function () {
      const { pyusdDeposit, mockPyusd, owner, otherAccount } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("200", 6);
      await mockPyusd.connect(otherAccount).approve(await pyusdDeposit.getAddress(), depositAmount);
      await pyusdDeposit.connect(otherAccount).depositPyusd(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(owner.address, withdrawAmount, nonce),
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(owner.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await pyusdDeposit.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await pyusdDeposit.generateLeaf(owner.address, withdrawAmount, nonce);
      await pyusdDeposit.connect(owner).withdraw(withdrawAmount, nonce, proof, leafHash);
      await expect(pyusdDeposit.connect(owner).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.be.revertedWith("Already spent");
    });
    it("Should fail if merkle root not set", async function () {
      const { pyusdDeposit, owner } = await loadFixture(deployPyusdDepositFixture);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leafHash = await pyusdDeposit.generateLeaf(owner.address, withdrawAmount, nonce);
      await expect(pyusdDeposit.connect(owner).withdraw(withdrawAmount, nonce, [], leafHash))
        .to.be.revertedWith("Merkle root not set");
    });
  });
  describe("View Functions", function () {
    it("Should return correct contract balance", async function () {
      const { pyusdDeposit, mockPyusd, owner } = await loadFixture(deployPyusdDepositFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.approve(await pyusdDeposit.getAddress(), depositAmount);
      await pyusdDeposit.depositPyusd(depositAmount);
      expect(await pyusdDeposit.getContractBalance()).to.equal(depositAmount);
    });
  });
});