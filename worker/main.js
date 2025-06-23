const { ethers } = require('ethers');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

console.log('🚀 Worker starting up...');

const CONTRACT_ADDRESS = '0x8461Ca63fBc0532beD991279A585a0b8e21D3184';
const MERKLE_BANK_ADDRESS = process.env.MERKLE_BANK_ADDRESS || '0x8461Ca63fBc0532beD991279A585a0b8e21D3184';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const API_URL = process.env.API_URL || 'http://localhost:3001';
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const POLL_INTERVAL = 1500;
const MERKLE_UPDATE_INTERVAL = 60000; // 1 minute 

console.log(`📍 Contract Address: ${CONTRACT_ADDRESS}`);
console.log(`🌳 MerkleBank Address: ${MERKLE_BANK_ADDRESS}`);
console.log(`🌐 API URL: ${API_URL}`);
console.log(`⏱️  Poll Interval: ${POLL_INTERVAL}ms`);
console.log(`🔄 Merkle Update Interval: ${MERKLE_UPDATE_INTERVAL}ms (${MERKLE_UPDATE_INTERVAL / 1000}s)`);
console.log(`🔑 Private Key: ${PRIVATE_KEY ? 'Configured' : 'Not provided'}`);

const CONTRACT_ABI = [
  "event Deposit(address indexed user, uint256 amount, uint256 timestamp)",
  "event Withdrawn(address indexed user, uint256 amount, uint256 nonce)"
];

const MERKLE_BANK_ABI = [
  "function updateRoot(bytes32 newRoot) external",
  "function merkleRoot() view returns (bytes32)",
  "event RootUpdated(bytes32 newRoot)"
];

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

console.log('✅ Supabase configuration loaded');
const supabase = createClient(supabaseUrl, supabaseKey);

let provider;
let contract;
let merkleContract;
let signer;
let lastProcessedBlock = 0;
let lastKnownMerkleRoot = null;

const BLOCK_FILE_PATH = path.join(__dirname, 'block.txt');

function readLastProcessedBlock() {
    try {
        if (fs.existsSync(BLOCK_FILE_PATH)) {
            const blockData = fs.readFileSync(BLOCK_FILE_PATH, 'utf8').trim();
            const blockNumber = parseInt(blockData);
            if (!isNaN(blockNumber)) {
                console.log(`📁 Read last processed block from file: ${blockNumber}`);
                return blockNumber;
            }
        }
        console.log('📁 No valid block file found');
        return null;
    } catch (error) {
        console.error('❌ Error reading last processed block:', error.message);
        return null;
    }
}

function saveLastProcessedBlock(blockNumber) {
    try {
        fs.writeFileSync(BLOCK_FILE_PATH, blockNumber.toString());
        console.log(`💾 Saved last processed block: ${blockNumber}`);
    } catch (error) {
        console.error('❌ Error saving last processed block:', error.message);
    }
}

async function initializeBlockchain() {
    try {
        console.log('🔗 Initializing blockchain connection...');
        provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
        
        const network = await provider.getNetwork();
        console.log(`🌐 Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
        
        if (network.chainId !== 11155111) {
            throw new Error('Not connected to Sepolia network (Chain ID should be 11155111)');
        }

        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        console.log('📋 Contract instance created');

        // Initialize MerkleBank contract with signer for transactions
        if (PRIVATE_KEY) {
            signer = new ethers.Wallet(PRIVATE_KEY, provider);
            merkleContract = new ethers.Contract(MERKLE_BANK_ADDRESS, MERKLE_BANK_ABI, signer);
            console.log('🌳 MerkleBank contract instance created with signer');
            
            // Get current merkle root from contract
            try {
                lastKnownMerkleRoot = await merkleContract.merkleRoot();
                console.log(`🌿 Current on-chain merkle root: ${lastKnownMerkleRoot}`);
            } catch (error) {
                console.log('❌ Could not fetch current merkle root from contract:', error.message);
            }
        } else {
            console.log('⚠️  No private key provided, merkle root updates will be disabled');
        }

        const currentBlock = await provider.getBlockNumber();
        console.log(`📊 Current block number: ${currentBlock}`);

        const savedBlock = readLastProcessedBlock();
        if (savedBlock !== null) {
            lastProcessedBlock = savedBlock;
            console.log(`🔄 Resuming from saved block: ${lastProcessedBlock}`);
        } else {
            lastProcessedBlock = Math.max(0, currentBlock - 100);
            console.log(`🆕 Starting from recent block: ${lastProcessedBlock} (current - 100)`);
        }

        console.log('✅ Blockchain initialization complete');
    } catch (error) {
        console.error('❌ Failed to initialize blockchain:', error.message);
        throw error;
    }
}

async function updateUserBalance(address, amountChange, isDeposit = true) {
    try {
        console.log(`💰 Updating balance for ${address}: ${isDeposit ? '+' : '-'}${Math.abs(amountChange)} PYUSD`);
        
        const normalizedAddress = address.toLowerCase();
        
        const { data: existingData, error: fetchError } = await supabase
            .from('balances')
            .select('balance, nonce')
            .ilike('address', address)
            .single();

        let currentBalance = 0;
        let currentNonce = 0;

        if (existingData && !fetchError) {
            currentBalance = parseFloat(existingData.balance) || 0;
            currentNonce = parseInt(existingData.nonce) || 0;
            console.log(`📊 Current balance: ${currentBalance}, nonce: ${currentNonce}`);
        } else {
            console.log('👤 New user detected');
        }

        const newBalance = Math.max(0, Math.round((currentBalance + amountChange) * 1000000) / 1000000); 
        const newNonce = isDeposit ? currentNonce + 1 : currentNonce; 

        console.log(`📊 New balance: ${newBalance}, nonce: ${newNonce}`);

        if (existingData && !fetchError) {
            const { error } = await supabase
                .from('balances')
                .update({ 
                    balance: newBalance,
                    nonce: newNonce
                })
                .ilike('address', address);
            
            if (error) throw error;
            console.log('✅ Balance updated successfully');
        } else {
            const { error } = await supabase
                .from('balances')
                .insert({
                    address: normalizedAddress,
                    balance: newBalance,
                    nonce: newNonce
                });
            
            if (error) throw error;
            console.log('✅ New user balance created successfully');
        }

        return { newBalance, newNonce };
    } catch (error) {
        console.error('❌ Error updating user balance:', error.message);
        throw error;
    }
}

async function processDepositEvent(event) {
    const { user, amount, timestamp } = event.args;
    const blockNumber = event.blockNumber;
    const transactionHash = event.transactionHash;
    
    const amountFormatted = ethers.utils.formatUnits(amount, 6);
    const timestampDate = new Date(timestamp.toNumber() * 1000);
    
    console.log(`💳 Processing Deposit Event:`);
    console.log(`   User: ${user}`);
    console.log(`   Amount: ${amountFormatted} PYUSD`);
    console.log(`   Timestamp: ${timestampDate.toISOString()}`);
    console.log(`   Block: ${blockNumber}`);
    console.log(`   TX Hash: ${transactionHash}`);
    
    try {
        await updateUserBalance(user, parseFloat(amountFormatted), true);
        console.log('✅ Deposit processed successfully');
    } catch (error) {
        console.error('❌ Error processing deposit:', error.message);
    }
}

async function processWithdrawalEvent(event) {
    const { user, amount, nonce } = event.args;
    const blockNumber = event.blockNumber;
    const transactionHash = event.transactionHash;
    
    const amountFormatted = ethers.utils.formatUnits(amount, 6);
    
    console.log(`💸 Processing Withdrawal Event:`);
    console.log(`   User: ${user}`);
    console.log(`   Amount: ${amountFormatted} PYUSD`);
    console.log(`   Nonce: ${nonce.toString()}`);
    console.log(`   Block: ${blockNumber}`);
    console.log(`   TX Hash: ${transactionHash}`);
    
    try {
        await updateUserBalance(user, -parseFloat(amountFormatted), false);
        console.log('✅ Withdrawal processed successfully');
    } catch (error) {
        console.error('❌ Error processing withdrawal:', error.message);
    }
}

async function scanBlockRange(fromBlock, toBlock) {
    try {
        console.log(`🔍 Scanning blocks ${fromBlock} to ${toBlock}...`);
        
        const depositFilter = contract.filters.Deposit();
        const depositEvents = await contract.queryFilter(depositFilter, fromBlock, toBlock);
        
        const withdrawalFilter = contract.filters.Withdrawn();
        const withdrawalEvents = await contract.queryFilter(withdrawalFilter, fromBlock, toBlock);

        if (depositEvents.length > 0) {
            console.log(`💳 Found ${depositEvents.length} deposit event(s)`);
            depositEvents.forEach((event, index) => {
                console.log(`   Deposit ${index + 1}: ${event.transactionHash}`);
            });
        }

        if (withdrawalEvents.length > 0) {
            console.log(`💸 Found ${withdrawalEvents.length} withdrawal event(s)`);
            withdrawalEvents.forEach((event, index) => {
                console.log(`   Withdrawal ${index + 1}: ${event.transactionHash}`);
            });
        }

        const allEvents = [...depositEvents, ...withdrawalEvents].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) {
                return a.blockNumber - b.blockNumber;
            }
            return a.logIndex - b.logIndex;
        });

        if (allEvents.length > 0) {
            console.log(`⚡ Processing ${allEvents.length} total event(s) in chronological order`);
        }

        for (const event of allEvents) {
            if (event.event === 'Deposit') {
                await processDepositEvent(event);
            } else if (event.event === 'Withdrawn') {
                await processWithdrawalEvent(event);
            }
        }

        if (allEvents.length === 0) {
            console.log('📭 No events found in this block range');
        }

        return allEvents.length;
    } catch (error) {
        console.error('❌ Error scanning block range:', error.message);
        throw error;
    }
}

async function startScanning() {
    console.log('🔄 Starting continuous block scanning...');
    
    while (true) {
        try {
            const currentBlock = await provider.getBlockNumber();
            
            if (currentBlock > lastProcessedBlock) {
                const fromBlock = lastProcessedBlock + 1;
                const toBlock = currentBlock;
                
                console.log(`📊 Current block: ${currentBlock}, Last processed: ${lastProcessedBlock}`);
                
                const eventCount = await scanBlockRange(fromBlock, toBlock);
                
                if (eventCount > 0) {
                    console.log(`✨ Processed ${eventCount} event(s) successfully`);
                }
                
                lastProcessedBlock = currentBlock;
                saveLastProcessedBlock(currentBlock);
            } else {
                console.log(`⏳ No new blocks (current: ${currentBlock})`);
            }
            
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        } catch (error) {
            console.error('❌ Error in scanning loop:', error.message);
            console.log('⏳ Waiting 30 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 30000));
        }
    }
}

async function fetchMerkleRootFromAPI() {
    try {
        console.log('🔍 Fetching current merkle root from API...');
        const response = await axios.get(`${API_URL}/api/merkle/status`, {
            timeout: 10000 // 10 second timeout
        });
        
        if (response.data && response.data.success) {
            const merkleRoot = response.data.data.merkleRoot;
            console.log(`🌿 API merkle root: ${merkleRoot || 'null'}`);
            return merkleRoot;
        } else {
            console.log('❌ Invalid response from API:', response.data);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching merkle root from API:', error.message);
        return null;
    }
}

async function updateMerkleRootOnChain(newRoot) {
    try {
        if (!merkleContract || !signer) {
            console.log('❌ No merkle contract or signer available for update');
            return false;
        }

        if (!newRoot || newRoot === ethers.constants.HashZero) {
            console.log('⚠️  Skipping update: merkle root is null or zero');
            return false;
        }

        console.log(`🚀 Updating merkle root on-chain to: ${newRoot}`);
        
        // Estimate gas first
        try {
            const gasEstimate = await merkleContract.estimateGas.updateRoot(newRoot);
            console.log(`⛽ Estimated gas: ${gasEstimate.toString()}`);
        } catch (gasError) {
            console.error('❌ Gas estimation failed:', gasError.message);
            // Continue anyway, let ethers handle gas
        }

        const tx = await merkleContract.updateRoot(newRoot, {
            gasLimit: 100000 // Set a reasonable gas limit
        });
        
        console.log(`📝 Transaction submitted: ${tx.hash}`);
        console.log('⏳ Waiting for confirmation...');
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            console.log(`✅ Merkle root updated successfully!`);
            console.log(`   Block: ${receipt.blockNumber}`);
            console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
            console.log(`   Transaction: ${receipt.transactionHash}`);
            
            lastKnownMerkleRoot = newRoot;
            return true;
        } else {
            console.log('❌ Transaction failed');
            return false;
        }
    } catch (error) {
        console.error('❌ Error updating merkle root on-chain:', error.message);
        
        // Check if it's a known error
        if (error.message.includes('Not the owner')) {
            console.error('❌ Account is not the owner of the contract');
        } else if (error.message.includes('insufficient funds')) {
            console.error('❌ Insufficient funds for transaction');
        }
        
        return false;
    }
}

async function checkAndUpdateMerkleRoot() {
    try {
        console.log('🔄 Checking for merkle root updates...');
        
        const apiMerkleRoot = await fetchMerkleRootFromAPI();
        
        if (!apiMerkleRoot) {
            console.log('⚠️  No merkle root available from API, skipping update');
            return;
        }

        if (apiMerkleRoot === lastKnownMerkleRoot) {
            console.log('✅ Merkle root unchanged, no update needed');
            return;
        }

        console.log(`🔄 Merkle root change detected:`);
        console.log(`   Current: ${lastKnownMerkleRoot || 'null'}`);
        console.log(`   New:     ${apiMerkleRoot}`);
        
        const success = await updateMerkleRootOnChain(apiMerkleRoot);
        
        if (success) {
            console.log('🎉 Merkle root update completed successfully!');
        } else {
            console.log('❌ Merkle root update failed');
        }
    } catch (error) {
        console.error('❌ Error in merkle root check and update:', error.message);
    }
}

async function startMerkleRootUpdater() {
    console.log('🌳 Starting merkle root updater...');
    console.log(`⏱️  Update interval: Every minute at :00 seconds (world clock aligned)`);
    
    // Calculate milliseconds until the next :00 second
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds();
    const millisecondsUntilNextMinute = (secondsUntilNextMinute * 1000) - now.getMilliseconds();
    
    console.log(`🕐 Current time: ${now.toISOString()}`);
    console.log(`⏳ Waiting ${millisecondsUntilNextMinute}ms until next :00 second mark`);
    
    // Run immediately first
    await checkAndUpdateMerkleRoot();
    
    // Wait until the next :00 second, then start the aligned interval
    setTimeout(() => {
        console.log(`🎯 Now aligned with world clock! Running updates at every :00 second`);
        
        // Run immediately at the aligned time
        checkAndUpdateMerkleRoot();
        
        // Then set up the interval to run every minute at :00 seconds
        setInterval(async () => {
            const updateTime = new Date();
            console.log(`🕐 Scheduled update at: ${updateTime.toISOString()}`);
            await checkAndUpdateMerkleRoot();
        }, MERKLE_UPDATE_INTERVAL);
        
    }, millisecondsUntilNextMinute);
}

process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

async function main() {
    try {
        console.log('🎯 Starting main application...');
        await initializeBlockchain();
        
        // Start both processes concurrently
        console.log('🚀 Starting concurrent processes...');
        
        // Start merkle root updater if we have the necessary configuration
        if (PRIVATE_KEY && merkleContract) {
            startMerkleRootUpdater(); // Don't await this, let it run in background
        } else {
            console.log('⚠️  Merkle root updater disabled (missing private key or contract)');
        }
        
        // Start block scanning (this will run indefinitely)
        await startScanning();
    } catch (error) {
        console.error('💥 Fatal error in main:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    main,
    processDepositEvent,
    processWithdrawalEvent
};