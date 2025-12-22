// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title QuizRewardPool
 * @notice Manages reward pools for quizzes - deposits, stakes, entry fees, and claims
 */
contract QuizRewardPool is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Quiz {
        address creator;
        address rewardToken;
        uint256 totalRewardPool;
        uint256 remainingReward;
        address entryFeeToken;
        uint256 entryFeeAmount;
        address stakeToken;
        uint256 stakeAmount;
        uint256 totalEntryFees;
        uint256 totalStaked;
        bool active;
    }

    struct Participant {
        bool joined;
        bool staked;
        uint256 stakedAmount;
        uint256 entryFeePaid;
        bool rewardClaimed;
        uint256 rewardAmount;
    }

    // Quiz ID => Quiz data
    mapping(bytes32 => Quiz) public quizzes;
    
    // Quiz ID => Participant address => Participant data
    mapping(bytes32 => mapping(address => Participant)) public participants;

    // Events
    event QuizCreated(bytes32 indexed quizId, address indexed creator, address rewardToken, uint256 rewardAmount);
    event RewardDeposited(bytes32 indexed quizId, address indexed depositor, uint256 amount);
    event ParticipantJoined(bytes32 indexed quizId, address indexed participant, uint256 entryFee, uint256 stake);
    event RewardClaimed(bytes32 indexed quizId, address indexed winner, uint256 amount);
    event StakeReturned(bytes32 indexed quizId, address indexed participant, uint256 amount);
    event QuizClosed(bytes32 indexed quizId);
    event WinnerSet(bytes32 indexed quizId, address indexed winner, uint256 rewardAmount);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new quiz and deposit reward tokens
     * @param quizId Unique quiz identifier (from database)
     * @param rewardToken ERC20 token address for rewards
     * @param rewardAmount Total reward pool amount
     * @param entryFeeToken Token for entry fee (address(0) if none)
     * @param entryFeeAmount Entry fee amount (0 if none)
     * @param stakeToken Token for staking (address(0) if none)
     * @param stakeAmount Stake amount required (0 if none)
     */
    function createQuiz(
        bytes32 quizId,
        address rewardToken,
        uint256 rewardAmount,
        address entryFeeToken,
        uint256 entryFeeAmount,
        address stakeToken,
        uint256 stakeAmount
    ) external nonReentrant {
        require(quizzes[quizId].creator == address(0), "Quiz already exists");
        require(rewardToken != address(0), "Invalid reward token");
        require(rewardAmount > 0, "Reward amount must be > 0");

        // Transfer reward tokens from creator to contract
        IERC20(rewardToken).safeTransferFrom(msg.sender, address(this), rewardAmount);

        quizzes[quizId] = Quiz({
            creator: msg.sender,
            rewardToken: rewardToken,
            totalRewardPool: rewardAmount,
            remainingReward: rewardAmount,
            entryFeeToken: entryFeeToken,
            entryFeeAmount: entryFeeAmount,
            stakeToken: stakeToken,
            stakeAmount: stakeAmount,
            totalEntryFees: 0,
            totalStaked: 0,
            active: true
        });

        emit QuizCreated(quizId, msg.sender, rewardToken, rewardAmount);
        emit RewardDeposited(quizId, msg.sender, rewardAmount);
    }

    /**
     * @notice Join a quiz - pay entry fee and/or stake if required
     * @param quizId Quiz to join
     */
    function joinQuiz(bytes32 quizId) external nonReentrant {
        Quiz storage quiz = quizzes[quizId];
        require(quiz.active, "Quiz not active");
        require(!participants[quizId][msg.sender].joined, "Already joined");

        uint256 entryFeePaid = 0;
        uint256 stakedAmount = 0;

        // Pay entry fee if required
        if (quiz.entryFeeToken != address(0) && quiz.entryFeeAmount > 0) {
            IERC20(quiz.entryFeeToken).safeTransferFrom(msg.sender, address(this), quiz.entryFeeAmount);
            entryFeePaid = quiz.entryFeeAmount;
            quiz.totalEntryFees += quiz.entryFeeAmount;
        }

        // Stake tokens if required
        if (quiz.stakeToken != address(0) && quiz.stakeAmount > 0) {
            IERC20(quiz.stakeToken).safeTransferFrom(msg.sender, address(this), quiz.stakeAmount);
            stakedAmount = quiz.stakeAmount;
            quiz.totalStaked += quiz.stakeAmount;
        }

        participants[quizId][msg.sender] = Participant({
            joined: true,
            staked: stakedAmount > 0,
            stakedAmount: stakedAmount,
            entryFeePaid: entryFeePaid,
            rewardClaimed: false,
            rewardAmount: 0
        });

        emit ParticipantJoined(quizId, msg.sender, entryFeePaid, stakedAmount);
    }

    /**
     * @notice Set winner reward amount (only owner/backend)
     * @param quizId Quiz ID
     * @param winner Winner address
     * @param rewardAmount Reward amount for this winner
     */
    function setWinner(
        bytes32 quizId,
        address winner,
        uint256 rewardAmount
    ) external onlyOwner {
        Quiz storage quiz = quizzes[quizId];
        require(quiz.active, "Quiz not active");
        require(participants[quizId][winner].joined, "Not a participant");
        require(rewardAmount <= quiz.remainingReward, "Insufficient reward pool");

        participants[quizId][winner].rewardAmount = rewardAmount;
        quiz.remainingReward -= rewardAmount;

        emit WinnerSet(quizId, winner, rewardAmount);
    }

    /**
     * @notice Batch set winners
     */
    function setWinnersBatch(
        bytes32 quizId,
        address[] calldata winners,
        uint256[] calldata amounts
    ) external onlyOwner {
        require(winners.length == amounts.length, "Length mismatch");
        
        Quiz storage quiz = quizzes[quizId];
        require(quiz.active, "Quiz not active");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount <= quiz.remainingReward, "Insufficient reward pool");

        for (uint256 i = 0; i < winners.length; i++) {
            require(participants[quizId][winners[i]].joined, "Not a participant");
            participants[quizId][winners[i]].rewardAmount = amounts[i];
            emit WinnerSet(quizId, winners[i], amounts[i]);
        }

        quiz.remainingReward -= totalAmount;
    }

    /**
     * @notice Claim reward as winner
     * @param quizId Quiz ID
     */
    function claimReward(bytes32 quizId) external nonReentrant {
        Quiz storage quiz = quizzes[quizId];
        Participant storage participant = participants[quizId][msg.sender];
        
        require(participant.joined, "Not a participant");
        require(participant.rewardAmount > 0, "No reward to claim");
        require(!participant.rewardClaimed, "Already claimed");

        uint256 amount = participant.rewardAmount;
        participant.rewardClaimed = true;

        IERC20(quiz.rewardToken).safeTransfer(msg.sender, amount);

        emit RewardClaimed(quizId, msg.sender, amount);
    }

    /**
     * @notice Return stake to participant after quiz ends
     * @param quizId Quiz ID
     */
    function returnStake(bytes32 quizId) external nonReentrant {
        Quiz storage quiz = quizzes[quizId];
        Participant storage participant = participants[quizId][msg.sender];
        
        require(!quiz.active, "Quiz still active");
        require(participant.staked, "No stake to return");
        require(participant.stakedAmount > 0, "Stake already returned");

        uint256 amount = participant.stakedAmount;
        participant.stakedAmount = 0;
        quiz.totalStaked -= amount;

        IERC20(quiz.stakeToken).safeTransfer(msg.sender, amount);

        emit StakeReturned(quizId, msg.sender, amount);
    }

    /**
     * @notice Close quiz and allow stake returns
     * @param quizId Quiz ID
     */
    function closeQuiz(bytes32 quizId) external {
        Quiz storage quiz = quizzes[quizId];
        require(msg.sender == quiz.creator || msg.sender == owner(), "Not authorized");
        require(quiz.active, "Already closed");

        quiz.active = false;
        emit QuizClosed(quizId);
    }

    /**
     * @notice Withdraw remaining rewards (creator only, after quiz closed)
     */
    function withdrawRemainingRewards(bytes32 quizId) external nonReentrant {
        Quiz storage quiz = quizzes[quizId];
        require(msg.sender == quiz.creator, "Not creator");
        require(!quiz.active, "Quiz still active");
        require(quiz.remainingReward > 0, "No remaining rewards");

        uint256 amount = quiz.remainingReward;
        quiz.remainingReward = 0;

        IERC20(quiz.rewardToken).safeTransfer(msg.sender, amount);
    }

    /**
     * @notice Withdraw collected entry fees (creator only)
     */
    function withdrawEntryFees(bytes32 quizId) external nonReentrant {
        Quiz storage quiz = quizzes[quizId];
        require(msg.sender == quiz.creator, "Not creator");
        require(quiz.totalEntryFees > 0, "No entry fees");

        uint256 amount = quiz.totalEntryFees;
        quiz.totalEntryFees = 0;

        IERC20(quiz.entryFeeToken).safeTransfer(msg.sender, amount);
    }

    // View functions
    function getQuiz(bytes32 quizId) external view returns (Quiz memory) {
        return quizzes[quizId];
    }

    function getParticipant(bytes32 quizId, address participant) external view returns (Participant memory) {
        return participants[quizId][participant];
    }

    function hasJoined(bytes32 quizId, address participant) external view returns (bool) {
        return participants[quizId][participant].joined;
    }

    function getClaimableReward(bytes32 quizId, address participant) external view returns (uint256) {
        Participant memory p = participants[quizId][participant];
        if (p.rewardClaimed) return 0;
        return p.rewardAmount;
    }
}
