/**
 * Deploy Test Tokens on Base Sepolia
 * 
 * This script deploys mock ERC20 tokens for testing purposes.
 * Run with: pnpm dlx tsx scripts/deploy-test-tokens.ts
 * 
 * Prerequisites:
 * - DEPLOYER_PRIVATE_KEY in .env.local
 * - Base Sepolia ETH for gas (get from faucet)
 * 
 * Faucets:
 * - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
 * - https://faucet.quicknode.com/base/sepolia
 */

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
});

// Mock ERC20 ABI
const MOCK_ERC20_ABI = [
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'symbol', type: 'string' },
      { name: 'decimals', type: 'uint8' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Pre-compiled MockERC20 bytecode
const MOCK_ERC20_BYTECODE = '0x608060405234801561001057600080fd5b5060405161098538038061098583398101604081905261002f916101a0565b825161004290600090602086019061007a565b50815161005690600190602085019061007a565b506002805460ff191660ff9290921691909117905550600580546001600160a01b03191633179055610253565b828054610086906101fe565b90600052602060002090601f0160209004810192826100a857600085556100ee565b82601f106100c157805160ff19168380011785556100ee565b828001600101855582156100ee579182015b828111156100ee5782518255916020019190600101906100d3565b506100fa9291506100fe565b5090565b5b808211156100fa57600081556001016100ff565b634e487b7160e01b600052604160045260246000fd5b600082601f83011261013a57600080fd5b81516001600160401b038082111561015457610154610113565b604051601f8301601f19908116603f0116810190828211818310171561017c5761017c610113565b8160405283815260209250868385880101111561019857600080fd5b600091505b838210156101ba578582018301518183018401529082019061019d565b838211156101cb5760008385830101525b9695505050505050565b805160ff811681146101e657600080fd5b919050565b634e487b7160e01b600052602160045260246000fd5b600181811c9082168061021557607f821691505b6020821081141561023657634e487b7160e01b600052602260045260246000fd5b50919050565b60008060006060848603121561025157600080fd5b83516001600160401b038082111561026857600080fd5b61027487838801610129565b9450602086015191508082111561028a57600080fd5b5061029786828701610129565b9250506102a6604085016101d5565b90509250925092565b610723806102626000396000f3fe608060405234801561001057600080fd5b50600436106100cf5760003560e01c806340c10f191161008c57806395d89b411161006657806395d89b41146101b5578063a9059cbb146101bd578063dd62ed3e146101d0578063f2fde38b1461020957600080fd5b806340c10f191461016a57806370a082311461017f5780638da5cb5b146101a857600080fd5b806306fdde03146100d4578063095ea7b3146100f257806318160ddd1461011557806323b872dd14610127578063313ce5671461013a578063395093511461015757600080fd5b3660006100cf57005b600080fd5b6100dc61021c565b6040516100e991906105a8565b60405180910390f35b610105610100366004610619565b6102ae565b60405190151581526020016100e9565b6003545b6040519081526020016100e9565b610105610135366004610643565b6102c4565b60025460ff165b60405160ff90911681526020016100e9565b610105610165366004610619565b610378565b61017d610178366004610619565b6103b4565b005b61011961018d36600461067f565b6001600160a01b031660009081526004602052604090205490565b6005546001600160a01b03165b6040516001600160a01b0390911681526020016100e9565b6100dc610442565b6101056101cb366004610619565b610451565b6101196101de3660046106a1565b6001600160a01b03918216600090815260066020908152604080832093909416825291909152205490565b61017d61021736600461067f565b6104e0565b60606000805461022b906106d4565b80601f0160208091040260200160405190810160405280929190818152602001828054610257906106d4565b80156102a45780601f10610279576101008083540402835291602001916102a4565b820191906000526020600020905b81548152906001019060200180831161028757829003601f168201915b5050505050905090565b60006102bb33848461052c565b50600192915050565b6001600160a01b0383166000908152600460205260408120548211156103315760405162461bcd60e51b815260206004820152601460248201527f496e73756666696369656e742062616c616e636500000000000000000000000060448201526064015b60405180910390fd5b6001600160a01b038416600090815260066020908152604080832033845290915290205482111561036157600080fd5b61036c848484610590565b50600190505b9392505050565b3360008181526006602090815260408083206001600160a01b038716845290915281205490916102bb9185906103af908690610725565b61052c565b6005546001600160a01b031633146103fe5760405162461bcd60e51b815260206004820152600a60248201526927b7363c9037bbb732b960b11b6044820152606401610328565b80600360008282546104109190610725565b90915550506001600160a01b0382166000908152600460205260408120805483929061043d908490610725565b909155505050565b60606001805461022b906106d4565b3360009081526004602052604081205482111561046d57600080fd5b336000908152600460205260408120805484929061048c90849061073d565b90915550506001600160a01b038316600090815260046020526040812080548492906104b9908490610725565b90915550506040518281526001600160a01b0384169033906000805160206106ce8339815191529060200160405180910390a350600192915050565b6005546001600160a01b0316331461050c57600080fd5b600580546001600160a01b0319166001600160a01b0392909216919091179055565b6001600160a01b0383811660008181526006602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b6001600160a01b038316600090815260046020526040812080548392906105b890849061073d565b90915550506001600160a01b038216600090815260046020526040812080548392906105e5908490610725565b92505081905550816001600160a01b0316836001600160a01b03166000805160206106ce8339815191528360405161058391815260200190565b600060208083528351808285015260005b818110156105d5578581018301518582016040015282016105b9565b818111156105e7576000604083870101525b50601f01601f1916929092016040019392505050565b80356001600160a01b038116811461061457600080fd5b919050565b6000806040838503121561062c57600080fd5b610635836105fd565b946020939093013593505050565b60008060006060848603121561065857600080fd5b610661846105fd565b925061066f602085016105fd565b9150604084013590509250925092565b60006020828403121561069157600080fd5b61069a826105fd565b9392505050565b600080604083850312156106b457600080fd5b6106bd836105fd565b91506106cb602084016105fd565b90509250929050565b634e487b7160e01b600052602260045260246000fdfeddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3efa2646970667358221220' as Hex;

interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
}

const TOKENS_TO_DEPLOY: TokenConfig[] = [
  { name: 'Test SUP Token', symbol: 'tSUP', decimals: 18 },
  { name: 'Test Banger Token', symbol: 'tBANGER', decimals: 18 },
  { name: 'Test USDC', symbol: 'tUSDC', decimals: 6 },
];

async function main() {
  console.log('🚀 Deploying Test Tokens on Base Sepolia...\n');

  // Check environment
  const privateKey = envVars['DEPLOYER_PRIVATE_KEY'];
  if (!privateKey) {
    console.error('❌ DEPLOYER_PRIVATE_KEY not found in .env.local');
    console.log('\nPlease add your deployer private key to .env.local:');
    console.log('DEPLOYER_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  // Create account and clients
  const account = privateKeyToAccount(privateKey as Hex);
  
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });

  console.log(`📍 Network: Base Sepolia (Chain ID: ${baseSepolia.id})`);
  console.log(`👛 Deployer: ${account.address}`);

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`💰 Balance: ${formatUnits(balance, 18)} ETH\n`);

  if (balance === 0n) {
    console.error('❌ No ETH balance! Get testnet ETH from:');
    console.log('   - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    console.log('   - https://faucet.quicknode.com/base/sepolia');
    process.exit(1);
  }

  // Deploy tokens
  const deployedTokens: { symbol: string; address: string }[] = [];

  for (const token of TOKENS_TO_DEPLOY) {
    console.log(`📦 Deploying ${token.name} (${token.symbol})...`);

    try {
      // Deploy contract
      const hash = await walletClient.deployContract({
        abi: MOCK_ERC20_ABI,
        bytecode: MOCK_ERC20_BYTECODE,
        args: [token.name, token.symbol, token.decimals],
      });

      console.log(`   ⏳ Waiting for deployment... (tx: ${hash.slice(0, 10)}...)`);
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const contractAddress = receipt.contractAddress!;
      
      console.log(`   ✅ Deployed at: ${contractAddress}`);

      // Mint initial supply to deployer
      const mintAmount = token.decimals === 6 
        ? parseUnits('1000000', 6) // 1M USDC
        : parseUnits('10000000', 18); // 10M tokens

      console.log(`   🪙 Minting initial supply...`);
      
      const mintHash = await walletClient.writeContract({
        address: contractAddress,
        abi: MOCK_ERC20_ABI,
        functionName: 'mint',
        args: [account.address, mintAmount],
      });

      await publicClient.waitForTransactionReceipt({ hash: mintHash });
      console.log(`   ✅ Minted ${formatUnits(mintAmount, token.decimals)} ${token.symbol}`);

      deployedTokens.push({ symbol: token.symbol, address: contractAddress });
      console.log('');
    } catch (error) {
      console.error(`   ❌ Failed to deploy ${token.symbol}:`, error);
    }
  }

  // Print summary
  console.log('\n📋 Deployment Summary:');
  console.log('========================');
  for (const token of deployedTokens) {
    console.log(`${token.symbol}: ${token.address}`);
  }

  // Print env variables to add
  console.log('\n📝 Add these to your .env.local:');
  console.log('================================');
  console.log('# Base Sepolia Test Tokens');
  for (const token of deployedTokens) {
    const envKey = `NEXT_PUBLIC_TESTNET_${token.symbol.replace('t', '').toUpperCase()}_ADDRESS`;
    console.log(`${envKey}=${token.address}`);
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
