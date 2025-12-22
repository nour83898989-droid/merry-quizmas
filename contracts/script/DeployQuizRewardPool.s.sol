// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/QuizRewardPool.sol";

contract DeployQuizRewardPool is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        QuizRewardPool pool = new QuizRewardPool();
        
        console.log("QuizRewardPool deployed at:", address(pool));
        
        vm.stopBroadcast();
    }
}
