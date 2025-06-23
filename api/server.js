const express = require('express');
const cors = require('cors');
const ethers = require('ethers');
const { MerkleTree } = require('merkletreejs');
const crypto = require('crypto');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🚀 API Server starting up...');

const app = express();
const PORT = process.env.PORT || 3001;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
}

console.log('✅ Supabase configuration loaded');
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

let merkleTree = null;
let merkleRoot = null;

const hashFunction = (data) => {
    return crypto.createHash('sha256').update(data).digest();
};

const createLeaf = (address, amount, nonce) => {
    const leaf = ethers.utils.solidityKeccak256(
        ['address', 'uint256', 'uint256'],
        [address, Math.floor(amount * 1000000), nonce] 
    );
    
    console.log(`🍃 Merkle Leaf Created:`);
    console.log(`   Address: ${address}`);
    console.log(`   Amount: ${amount} PYUSD`);
    console.log(`   Nonce: ${nonce}`);
    console.log(`   Leaf Hash: ${leaf}`);
    
    return leaf;
};

const loadBalancesFromSupabase = async () => {
    try {
        console.log('📊 Loading balances and rebuilding merkle tree...');
        await rebuildMerkleTree();
    } catch (error) {
        console.error('❌ Error loading balances:', error.message);
    }
};

const rebuildMerkleTree = async () => {
    try {
        console.log('🌳 Rebuilding Merkle Tree...');
        
        const { data, error } = await supabase
            .from('balances')
            .select('address, balance, nonce');

        if (error) {
            console.error('❌ Error fetching balances for merkle tree:', error.message);
            return;
        }

        if (!data || data.length === 0) {
            console.log('📭 No balances found - setting merkle tree to null');
            merkleTree = null;
            merkleRoot = null;
            return;
        }

        console.log(`👥 Processing ${data.length} user balance(s) for merkle tree`);

        const leaves = data.map(({ address, balance, nonce }) => 
            createLeaf(address.toLowerCase(), parseFloat(balance), parseInt(nonce || 0))
        );

        console.log(`🍃 Generated ${leaves.length} merkle leaves`);
        console.log('🔨 Building merkle tree with keccak256 hash function...');

        merkleTree = new MerkleTree(leaves, ethers.utils.keccak256, { sortPairs: true, hashLeaves: false });
        const newMerkleRoot = merkleTree.getHexRoot();

        console.log(`🌿 NEW MERKLE ROOT COMPUTED: ${newMerkleRoot}`);
        
        if (merkleRoot !== newMerkleRoot) {
            console.log(`🔄 Merkle root changed from: ${merkleRoot || 'null'}`);
            console.log(`                        to: ${newMerkleRoot}`);
            merkleRoot = newMerkleRoot;
        } else {
            console.log(`✅ Merkle root unchanged: ${merkleRoot}`);
        }

        console.log(`📊 Merkle tree stats:`);
        console.log(`   Depth: ${merkleTree.getDepth()}`);
        console.log(`   Leaf count: ${merkleTree.getLeafCount()}`);
        console.log(`   ✅ Merkle tree rebuild complete!`);

    } catch (error) {
        console.error('❌ Error rebuilding merkle tree:', error.message);
    }
};

const updateUserBalanceInSupabase = async (address, amount) => {
    try {
        console.log(`💰 Updating balance for ${address}: ${amount > 0 ? '+' : ''}${amount} PYUSD`);
        
        const normalizedAddress = address.toLowerCase();
        
        const { data: existingData, error: fetchError } = await supabase
            .from('balances')
            .select('balance, nonce')
            .ilike('address', address);

        let currentBalance = 0;
        let currentNonce = 0;

        if (existingData && !fetchError && existingData.length > 0) {
            currentBalance = parseFloat(existingData[0].balance);
            currentNonce = parseInt(existingData[0].nonce) || 0;
        }

        const newBalance = Math.round((currentBalance + parseFloat(amount)) * 100) / 100;
        const newNonce = currentNonce + 1; 

        if (existingData && existingData.length > 0) {
            const { data, error } = await supabase
                .from('balances')
                .update({ 
                    balance: newBalance,
                    nonce: newNonce
                })
                .ilike('address', address)
                .select();
            
            if (error) {
                throw error;
            }
        } else {
            const { data, error } = await supabase
                .from('balances')
                .insert({
                    address: normalizedAddress,
                    balance: newBalance,
                    nonce: newNonce
                })
                .select();
            
            if (error) {
                throw error;
            }
        }

        console.log(`🔄 Balance updated - triggering merkle tree rebuild...`);
        await rebuildMerkleTree();
        
        return { newBalance, newNonce };
    } catch (error) {
        console.error('❌ Error updating user balance:', error.message);
        throw error;
    }
};

const getUserBalanceFromSupabase = async (address) => {
    try {
        const normalizedAddress = address.toLowerCase();
        const { data: allData, error: allError } = await supabase
            .from('balances')
            .select('address, balance, nonce');
        const { data, error } = await supabase
            .from('balances')
            .select('balance, nonce')
            .ilike('address', address);
        if (error) {
            throw error;
        }
        if (!data || data.length === 0) {
            return {
                balance: 0,
                nonce: 0
            };
        }
        const record = data[0];
        const balance = record.balance ? parseFloat(record.balance) : 0;
        const nonce = record.nonce ? parseInt(record.nonce) : 0;
        return {
            balance: balance,
            nonce: nonce
        };
    } catch (error) {
        throw error;
    }
};

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/merkle/status', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('balances')
            .select('balance');
        if (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch balance statistics'
            });
        }
        const totalUsers = data ? data.length : 0;
        const totalBalance = data ? data.reduce((sum, record) => sum + parseFloat(record.balance || 0), 0) : 0;
        res.json({
            success: true,
            data: {
                merkleRoot: merkleRoot,
                totalUsers: totalUsers,
                totalBalance: Math.round(totalBalance * 100) / 100, 
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/users/:address/balance', async (req, res) => {
    try {
        const { address } = req.params;
        const { balance, nonce } = await getUserBalanceFromSupabase(address);
        res.json({
            success: true,
            data: {
                address,
                balance,
                nonce,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/merkle/proof/:address', async (req, res) => {
    try {
        const { address } = req.params;
        const normalizedAddress = address.toLowerCase();
        
        console.log(`🔍 Generating merkle proof for address: ${normalizedAddress}`);

        if (!merkleTree) {
            console.log('❌ No merkle tree available for proof generation');
            return res.status(400).json({
                success: false,
                error: 'No merkle tree available. No balances have been recorded yet.'
            });
        }

        const { balance, nonce } = await getUserBalanceFromSupabase(address);
        
        if (balance === 0) {
            console.log(`❌ Address ${normalizedAddress} not found or has zero balance`);
            return res.status(404).json({
                success: false,
                error: 'Address not found in merkle tree or has zero balance.'
            });
        }

        console.log(`📊 User data for proof:`);
        console.log(`   Balance: ${balance} PYUSD`);
        console.log(`   Nonce: ${nonce}`);

        const leaf = createLeaf(normalizedAddress, balance, nonce);
        
        console.log(`🌿 Generating merkle proof for leaf: ${leaf}`);
        const proof = merkleTree.getHexProof(leaf);
        
        const position = merkleTree.getProof(leaf).reduce((pos, proofElement, index) => {
            return pos + (proofElement.position === 'right' ? Math.pow(2, index) : 0);
        }, 0);

        console.log(`✅ Merkle proof generated successfully:`);
        console.log(`   Leaf: ${leaf}`);
        console.log(`   Root: ${merkleRoot}`);
        console.log(`   Position: ${position}`);
        console.log(`   Proof length: ${proof.length} elements`);
        console.log(`   Proof: [${proof.join(', ')}]`);

        res.json({
            success: true,
            data: {
                address: normalizedAddress,
                balance: balance,
                nonce: nonce,
                leaf: leaf,
                proof: proof,
                root: merkleRoot,
                position: position,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Error generating merkle proof:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/deposit', async (req, res) => {
    try {
        const { transactionHash, userAddress } = req.body;
        if (!transactionHash) {
            return res.status(400).json({
                success: false,
                error: 'Transaction hash is required'
            });
        }
        if (!userAddress) {
            return res.status(400).json({
                success: false,
                error: 'User address is required'
            });
        }
        if (!transactionHash.startsWith('0x') || transactionHash.length !== 66) {
            return res.status(400).json({
                success: false,
                error: 'Invalid transaction hash format'
            });
        }
        const provider = new ethers.providers.JsonRpcProvider(
            process.env.RPC_URL || 'https://rpc.ankr.com/eth'
        );
        const receipt = await provider.waitForTransaction(transactionHash, 1); 
        if (!receipt) {
            return res.status(400).json({
                success: false,
                error: 'Transaction not found or failed'
            });
        }
        if (receipt.status === 0) {
            return res.status(400).json({
                success: false,
                error: 'Transaction failed on blockchain'
            });
        }
        res.json({
            success: true,
            message: 'Transaction confirmed successfully',
            data: {
                transactionHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                status: receipt.status,
                from: receipt.from,
                to: receipt.to,
                userAddress: userAddress,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        if (error.code === 'TIMEOUT') {
            return res.status(408).json({
                success: false,
                error: 'Transaction confirmation timeout'
            });
        }
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const { userAddress, message, signedHash, recipientAddress, amount } = req.body;
        const isValid = verifySignature(userAddress, message, signedHash);
        if (!isValid) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid signature - transaction not signed by the specified user' 
            });
        }   
        const { balance: currentBalance } = await getUserBalanceFromSupabase(userAddress);
        if (currentBalance < parseFloat(amount)) {
            return res.status(400).json({ 
                success: false, 
                error: `Insufficient balance. Current: ${currentBalance}, Required: ${amount}` 
            });
        }
        const { newBalance: senderNewBalance, newNonce: senderNewNonce } = await updateUserBalanceInSupabase(userAddress, -amount);
        const { newBalance: recipientNewBalance, newNonce: recipientNewNonce } = await updateUserBalanceInSupabase(recipientAddress, amount);
        const { data: countData } = await supabase
            .from('balances')
            .select('id', { count: 'exact' });
        res.json({
            success: true,
            message: 'Transaction completed successfully',
            data: {
                sender: {
                    address: userAddress,
                    newBalance: senderNewBalance,
                    newNonce: senderNewNonce
                },
                recipient: {
                    address: recipientAddress,
                    newBalance: recipientNewBalance,
                    newNonce: recipientNewNonce
                },
                amount: amount,
                merkleRoot,
                totalUsers: countData ? countData.length : 0,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

function verifySignature(userAddress, message, signedHash) {
    try {
        const recoveredAddress = ethers.utils.verifyMessage(message, signedHash);
        const isValid = recoveredAddress.toLowerCase() === userAddress.toLowerCase();
        return isValid;
    } catch (error) {
        return false;
    }
}

const initializeServer = async () => {
    try {
        console.log('🎯 Initializing server...');
        await loadBalancesFromSupabase();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Current merkle root: ${merkleRoot || 'null'}`);
        });
    } catch (error) {
        console.error('💥 Fatal error initializing server:', error.message);
        process.exit(1);
    }
};

initializeServer();
module.exports = app;