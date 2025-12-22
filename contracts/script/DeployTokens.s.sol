// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";

contract DeployTokens is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy tSUP (18 decimals)
        MockERC20 tSUP = new MockERC20("Test SUP Token", "tSUP", 18);
        console.log("tSUP deployed at:", address(tSUP));
        tSUP.mint(deployer, 10_000_000 * 10**18); // 10M tokens
        console.log("Minted 10M tSUP to deployer");
        
        // Deploy tBANGER (18 decimals)
        MockERC20 tBANGER = new MockERC20("Test Banger Token", "tBANGER", 18);
        console.log("tBANGER deployed at:", address(tBANGER));
        tBANGER.mint(deployer, 10_000_000 * 10**18); // 10M tokens
        console.log("Minted 10M tBANGER to deployer");
        
        // Deploy tUSDC (6 decimals like real USDC)
        MockERC20 tUSDC = new MockERC20("Test USDC", "tUSDC", 6);
        console.log("tUSDC deployed at:", address(tUSDC));
        tUSDC.mint(deployer, 1_000_000 * 10**6); // 1M USDC
        console.log("Minted 1M tUSDC to deployer");
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("tSUP:", address(tSUP));
        console.log("tBANGER:", address(tBANGER));
        console.log("tUSDC:", address(tUSDC));
        console.log("");
        console.log("Add to .env.local:");
        console.log("NEXT_PUBLIC_TESTNET_SUP_ADDRESS=", address(tSUP));
        console.log("NEXT_PUBLIC_TESTNET_BANGER_ADDRESS=", address(tBANGER));
        console.log("NEXT_PUBLIC_TESTNET_USDC_ADDRESS=", address(tUSDC));
    }
}
