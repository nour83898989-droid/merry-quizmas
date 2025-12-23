// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/QuizRewardPool.sol";
import "../src/MockERC20.sol";

/**
 * @title BuilderCodeTest
 * @notice Tests that transactions with Builder Code suffix work correctly
 * @dev Builder Code: bc_gy096wvf (hex: 62635f6779303936777666)
 */
contract BuilderCodeTest is Test {
    QuizRewardPool public pool;
    MockERC20 public rewardToken;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    bytes32 public quizId = keccak256("test-quiz-1");
    
    // Builder Code as bytes
    bytes public constant BUILDER_CODE = hex"62635f6779303936777666"; // bc_gy096wvf
    
    function setUp() public {
        // Deploy contracts
        pool = new QuizRewardPool();
        rewardToken = new MockERC20("Test SUP", "tSUP", 18);
        
        // Mint tokens to user1
        rewardToken.mint(user1, 1000 ether);
        
        // Give users some ETH for gas
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        
        // Transfer token ownership to allow minting
        rewardToken.transferOwnership(address(this));
    }
    
    function test_CreateQuizWithBuilderCode() public {
        vm.startPrank(user1);
        
        // Approve tokens
        rewardToken.approve(address(pool), 100 ether);
        
        // Encode createQuiz call
        bytes memory callData = abi.encodeWithSelector(
            pool.createQuiz.selector,
            quizId,
            address(rewardToken),
            100 ether,
            address(0), // no entry fee
            0,
            address(0), // no stake
            0
        );
        
        // Append Builder Code to calldata
        bytes memory callDataWithBuilder = abi.encodePacked(callData, BUILDER_CODE);
        
        // Call with Builder Code appended - should succeed
        (bool success, ) = address(pool).call(callDataWithBuilder);
        assertTrue(success, "createQuiz with Builder Code should succeed");
        
        // Verify quiz was created by checking creator
        (address creator,,,,,,,,,, ) = pool.quizzes(quizId);
        assertEq(creator, user1, "Quiz creator should be user1");
        
        vm.stopPrank();
    }
    
    function test_ApproveWithBuilderCode() public {
        vm.startPrank(user1);
        
        // Encode approve call
        bytes memory callData = abi.encodeWithSelector(
            rewardToken.approve.selector,
            address(pool),
            100 ether
        );
        
        // Append Builder Code
        bytes memory callDataWithBuilder = abi.encodePacked(callData, BUILDER_CODE);
        
        // Call with Builder Code - should succeed
        (bool success, ) = address(rewardToken).call(callDataWithBuilder);
        assertTrue(success, "approve with Builder Code should succeed");
        
        // Verify allowance
        uint256 allowance = rewardToken.allowance(user1, address(pool));
        assertEq(allowance, 100 ether, "Allowance should be set");
        
        vm.stopPrank();
    }
    
    function test_JoinQuizWithBuilderCode() public {
        // First create a quiz
        vm.startPrank(user1);
        rewardToken.approve(address(pool), 100 ether);
        pool.createQuiz(
            quizId,
            address(rewardToken),
            100 ether,
            address(0),
            0,
            address(0),
            0
        );
        vm.stopPrank();
        
        // User2 joins with Builder Code
        vm.startPrank(user2);
        
        bytes memory callData = abi.encodeWithSelector(
            pool.joinQuiz.selector,
            quizId
        );
        
        bytes memory callDataWithBuilder = abi.encodePacked(callData, BUILDER_CODE);
        
        (bool success, ) = address(pool).call(callDataWithBuilder);
        assertTrue(success, "joinQuiz with Builder Code should succeed");
        
        // Verify user joined
        assertTrue(pool.hasJoined(quizId, user2), "User2 should have joined");
        
        vm.stopPrank();
    }
    
    function test_ClaimRewardWithBuilderCode() public {
        // Setup: create quiz, join, set winner
        vm.startPrank(user1);
        rewardToken.approve(address(pool), 100 ether);
        pool.createQuiz(
            quizId,
            address(rewardToken),
            100 ether,
            address(0),
            0,
            address(0),
            0
        );
        vm.stopPrank();
        
        vm.prank(user2);
        pool.joinQuiz(quizId);
        
        // Owner sets winner and closes quiz
        pool.setWinner(quizId, user2, 50 ether);
        pool.closeQuiz(quizId);
        
        // User2 claims with Builder Code
        vm.startPrank(user2);
        
        bytes memory callData = abi.encodeWithSelector(
            pool.claimReward.selector,
            quizId
        );
        
        bytes memory callDataWithBuilder = abi.encodePacked(callData, BUILDER_CODE);
        
        uint256 balanceBefore = rewardToken.balanceOf(user2);
        
        (bool success, ) = address(pool).call(callDataWithBuilder);
        assertTrue(success, "claimReward with Builder Code should succeed");
        
        uint256 balanceAfter = rewardToken.balanceOf(user2);
        assertEq(balanceAfter - balanceBefore, 50 ether, "Should receive 50 tokens");
        
        vm.stopPrank();
    }
    
    function test_BuilderCodeHexValue() public pure {
        // Verify Builder Code hex is correct
        bytes memory expected = "bc_gy096wvf";
        bytes memory builderHex = hex"62635f6779303936777666";
        
        assertEq(keccak256(expected), keccak256(builderHex), "Builder Code hex should match string");
    }
    
    function test_TransferWithBuilderCode() public {
        vm.startPrank(user1);
        
        // Encode transfer call
        bytes memory callData = abi.encodeWithSelector(
            rewardToken.transfer.selector,
            user2,
            10 ether
        );
        
        // Append Builder Code
        bytes memory callDataWithBuilder = abi.encodePacked(callData, BUILDER_CODE);
        
        uint256 balanceBefore = rewardToken.balanceOf(user2);
        
        // Call with Builder Code - should succeed
        (bool success, ) = address(rewardToken).call(callDataWithBuilder);
        assertTrue(success, "transfer with Builder Code should succeed");
        
        uint256 balanceAfter = rewardToken.balanceOf(user2);
        assertEq(balanceAfter - balanceBefore, 10 ether, "User2 should receive 10 tokens");
        
        vm.stopPrank();
    }
}
