import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
describe("MerklePyusdBank", function () {
  async function deployMerklePyusdBankFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockPyusd = await MockERC20.deploy("PayPal USD", "PYUSD", 6);
    const MerklePyusdBank = await ethers.getContractFactory("MerklePyusdBank");
    const merklePyusdBank = await MerklePyusdBank.deploy(await mockPyusd.getAddress());
    const mintAmount = ethers.parseUnits("10000", 6);
    await mockPyusd.mint(owner.address, mintAmount);
    await mockPyusd.mint(user1.address, mintAmount);
    await mockPyusd.mint(user2.address, mintAmount);
    await mockPyusd.mint(user3.address, mintAmount);
    return { merklePyusdBank, mockPyusd, owner, user1, user2, user3 };
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
      const { merklePyusdBank, owner } = await loadFixture(deployMerklePyusdBankFixture);
      expect(await merklePyusdBank.owner()).to.equal(owner.address);
    });
    it("Should set the correct PYUSD token address", async function () {
      const { merklePyusdBank, mockPyusd } = await loadFixture(deployMerklePyusdBankFixture);
      expect(await merklePyusdBank.pyusdToken()).to.equal(await mockPyusd.getAddress());
    });
    it("Should initialize with zero merkle root", async function () {
      const { merklePyusdBank } = await loadFixture(deployMerklePyusdBankFixture);
      expect(await merklePyusdBank.merkleRoot()).to.equal(ethers.ZeroHash);
    });
  });
  describe("Deposits", function () {
    it("Should allow users to deposit PYUSD", async function () {
      const { merklePyusdBank, mockPyusd, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await expect(merklePyusdBank.connect(user1).deposit(depositAmount))
        .to.emit(merklePyusdBank, "Deposited")
        .withArgs(user1.address, depositAmount);
      expect(await merklePyusdBank.getUserTotalDeposited(user1.address)).to.equal(depositAmount);
      expect(await merklePyusdBank.totalBankBalance()).to.equal(depositAmount);
    });
    it("Should fail if deposit amount is zero", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      await expect(merklePyusdBank.connect(user1).deposit(0))
        .to.be.revertedWith("Amount must be > 0");
    });
    it("Should fail if user has insufficient PYUSD balance", async function () {
      const { merklePyusdBank, mockPyusd, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("20000", 6); 
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await expect(merklePyusdBank.connect(user1).deposit(depositAmount))
        .to.be.revertedWith("Insufficient PYUSD balance");
    });
    it("Should fail if user hasn't approved enough allowance", async function () {
      const { merklePyusdBank, mockPyusd, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      const approveAmount = ethers.parseUnits("50", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), approveAmount);
      await expect(merklePyusdBank.connect(user1).deposit(depositAmount))
        .to.be.revertedWith("Insufficient allowance");
    });
  });
  describe("Merkle Root Management", function () {
    it("Should allow owner to update merkle root", async function () {
      const { merklePyusdBank, owner } = await loadFixture(deployMerklePyusdBankFixture);
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("test root"));
      await expect(merklePyusdBank.connect(owner).updateRoot(newRoot))
        .to.emit(merklePyusdBank, "RootUpdated")
        .withArgs(newRoot);
      expect(await merklePyusdBank.merkleRoot()).to.equal(newRoot);
    });
    it("Should fail if non-owner tries to update merkle root", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const newRoot = ethers.keccak256(ethers.toUtf8Bytes("test root"));
      await expect(merklePyusdBank.connect(user1).updateRoot(newRoot))
        .to.be.revertedWith("Not the owner");
    });
    it("Should fail if trying to set zero root", async function () {
      const { merklePyusdBank, owner } = await loadFixture(deployMerklePyusdBankFixture);
      await expect(merklePyusdBank.connect(owner).updateRoot(ethers.ZeroHash))
        .to.be.revertedWith("Root cannot be zero");
    });
  });
  describe("Merkle Proof Withdrawals", function () {
    it("Should allow withdrawal with valid merkle proof", async function () {
      const { merklePyusdBank, mockPyusd, owner, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await merklePyusdBank.connect(user1).deposit(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(user1.address, withdrawAmount, nonce),
        generateLeaf(user1.address, ethers.parseUnits("25", 6), 2n), 
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(user1.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await merklePyusdBank.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, withdrawAmount, nonce);
      await expect(merklePyusdBank.connect(user1).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.emit(merklePyusdBank, "Withdrawn")
        .withArgs(user1.address, withdrawAmount, nonce);
      expect(await merklePyusdBank.isNullifierUsed(user1.address, nonce)).to.be.true;
    });
    it("Should fail withdrawal with invalid merkle proof", async function () {
      const { merklePyusdBank, mockPyusd, owner, user1, user2 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await merklePyusdBank.connect(user1).deposit(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(user2.address, withdrawAmount, nonce), 
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(user2.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await merklePyusdBank.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, withdrawAmount, nonce);
      await expect(merklePyusdBank.connect(user1).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.be.revertedWith("Invalid Merkle proof");
    });
    it("Should fail if nullifier already used", async function () {
      const { merklePyusdBank, mockPyusd, owner, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("200", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await merklePyusdBank.connect(user1).deposit(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leaves = [
        generateLeaf(user1.address, withdrawAmount, nonce),
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = generateLeaf(user1.address, withdrawAmount, nonce);
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      await merklePyusdBank.connect(owner).updateRoot("0x" + root.toString('hex'));
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, withdrawAmount, nonce);
      await merklePyusdBank.connect(user1).withdraw(withdrawAmount, nonce, proof, leafHash);
      await expect(merklePyusdBank.connect(user1).withdraw(withdrawAmount, nonce, proof, leafHash))
        .to.be.revertedWith("Already spent");
    });
    it("Should fail if merkle root not set", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const nonce = 1n;
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, withdrawAmount, nonce);
      await expect(merklePyusdBank.connect(user1).withdraw(withdrawAmount, nonce, [], leafHash))
        .to.be.revertedWith("Merkle root not set");
    });
  });
  describe("Helper Functions", function () {
    it("Should correctly validate leaf", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const amount = ethers.parseUnits("100", 6);
      const nonce = 1n;
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, amount, nonce);
      expect(await merklePyusdBank.connect(user1).validateLeaf(leafHash, amount, nonce)).to.be.true;
    });
    it("Should reject invalid leaf", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const amount = ethers.parseUnits("100", 6);
      const wrongAmount = ethers.parseUnits("200", 6);
      const nonce = 1n;
      const leafHash = await merklePyusdBank.generateLeaf(user1.address, amount, nonce);
      expect(await merklePyusdBank.connect(user1).validateLeaf(leafHash, wrongAmount, nonce)).to.be.false;
    });
    it("Should correctly verify merkle proof", async function () {
      const { merklePyusdBank } = await loadFixture(deployMerklePyusdBankFixture);
      const leaves = [
        Buffer.from(ethers.keccak256(ethers.toUtf8Bytes("leaf1")).slice(2), 'hex'),
        Buffer.from(ethers.keccak256(ethers.toUtf8Bytes("leaf2")).slice(2), 'hex'),
      ];
      const tree = createMerkleTree(leaves);
      const root = tree.getRoot();
      const leaf = leaves[0];
      const proof = tree.getProof(leaf).map(x => "0x" + x.data.toString('hex'));
      const isValid = await merklePyusdBank.verifyMerkleProof(
        proof,
        "0x" + root.toString('hex'),
        "0x" + leaf.toString('hex')
      );
      expect(isValid).to.be.true;
    });
  });
  describe("View Functions", function () {
    it("Should return correct contract balance", async function () {
      const { merklePyusdBank, mockPyusd, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await merklePyusdBank.connect(user1).deposit(depositAmount);
      expect(await merklePyusdBank.getContractBalance()).to.equal(depositAmount);
    });
    it("Should return correct user total deposited", async function () {
      const { merklePyusdBank, mockPyusd, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount1 = ethers.parseUnits("100", 6);
      const depositAmount2 = ethers.parseUnits("50", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount1 + depositAmount2);
      await merklePyusdBank.connect(user1).deposit(depositAmount1);
      await merklePyusdBank.connect(user1).deposit(depositAmount2);
      expect(await merklePyusdBank.getUserTotalDeposited(user1.address)).to.equal(depositAmount1 + depositAmount2);
    });
  });
  describe("Owner Functions", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { merklePyusdBank, owner, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      await expect(merklePyusdBank.connect(owner).transferOwnership(user1.address))
        .to.emit(merklePyusdBank, "OwnershipTransferred")
        .withArgs(owner.address, user1.address);
      expect(await merklePyusdBank.owner()).to.equal(user1.address);
    });
    it("Should allow owner to emergency withdraw", async function () {
      const { merklePyusdBank, mockPyusd, owner, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      const depositAmount = ethers.parseUnits("100", 6);
      await mockPyusd.connect(user1).approve(await merklePyusdBank.getAddress(), depositAmount);
      await merklePyusdBank.connect(user1).deposit(depositAmount);
      const withdrawAmount = ethers.parseUnits("50", 6);
      const initialBalance = await mockPyusd.balanceOf(owner.address);
      await merklePyusdBank.connect(owner).emergencyWithdraw(withdrawAmount);
      expect(await mockPyusd.balanceOf(owner.address)).to.equal(initialBalance + withdrawAmount);
    });
    it("Should fail if non-owner tries to emergency withdraw", async function () {
      const { merklePyusdBank, user1 } = await loadFixture(deployMerklePyusdBankFixture);
      await expect(merklePyusdBank.connect(user1).emergencyWithdraw(100))
        .to.be.revertedWith("Not the owner");
    });
  });
});