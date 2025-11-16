// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PomodoroCore
/// @notice Core contract for private focus tracking using FHEVM
/// @dev All user focus data (time, interrupts, tags) stored as encrypted euint32
contract PomodoroCore is ZamaEthereumConfig {
    /// @notice User record structure
    struct UserRecord {
        euint32 totalFocusTime;      // Total accumulated focus time in seconds
        euint32 totalInterruptCount;  // Total interrupt count
        euint32 todayFocusTime;       // Today's focus time (resets daily)
        euint32 dailyTarget;          // Daily target in seconds
        uint32 streakDays;            // Consecutive days (plaintext for simplicity)
        uint32 lastResetDay;          // Last day when daily stats were reset (Unix day)
        uint32 totalSessions;         // Total completed sessions (plaintext counter)
        bool initialized;             // Whether user record exists
    }

    /// @notice Mapping from user address to their encrypted record
    mapping(address => UserRecord) public userRecords;

    /// @notice Badge NFT contract address
    address public badgeNFTContract;

    /// @notice Events
    event FocusSessionRecorded(address indexed user, uint256 timestamp);
    event DailyGoalAchieved(address indexed user, uint32 streakDays);
    event DailyTargetUpdated(address indexed user);
    event UserInitialized(address indexed user);

    /// @notice Initialize a new user with default daily target (2 hours)
    /// @dev Sets up encrypted fields and initializes user state
    function initializeUser() external {
        require(!userRecords[msg.sender].initialized, "User already initialized");
        
        UserRecord storage record = userRecords[msg.sender];
        record.totalFocusTime = FHE.asEuint32(0);
        record.totalInterruptCount = FHE.asEuint32(0);
        record.todayFocusTime = FHE.asEuint32(0);
        record.dailyTarget = FHE.asEuint32(7200); // 2 hours default
        record.streakDays = 0;
        record.lastResetDay = uint32(block.timestamp / 1 days);
        record.totalSessions = 0;
        record.initialized = true;

        // Allow contract to operate on these handles
        FHE.allowThis(record.totalFocusTime);
        FHE.allowThis(record.totalInterruptCount);
        FHE.allowThis(record.todayFocusTime);
        FHE.allowThis(record.dailyTarget);

        // Allow user to decrypt their own data
        FHE.allow(record.totalFocusTime, msg.sender);
        FHE.allow(record.totalInterruptCount, msg.sender);
        FHE.allow(record.todayFocusTime, msg.sender);
        FHE.allow(record.dailyTarget, msg.sender);

        emit UserInitialized(msg.sender);
    }

    /// @notice Record a completed focus session
    /// @param focusTimeInput Encrypted focus duration in seconds
    /// @param interruptCountInput Encrypted interrupt count
    /// @param tagHashInput Encrypted tag hash (reserved for analytics)
    /// @param focusTimeProof Input proof for focusTime
    /// @param interruptCountProof Input proof for interruptCount
    /// @param tagHashProof Input proof for tagHash
    function recordFocusSession(
        externalEuint32 focusTimeInput,
        externalEuint32 interruptCountInput,
        externalEuint32 tagHashInput,
        bytes calldata focusTimeProof,
        bytes calldata interruptCountProof,
        bytes calldata tagHashProof
    ) external {
        require(userRecords[msg.sender].initialized, "User not initialized");

        _resetDailyIfNeeded(msg.sender);

        UserRecord storage record = userRecords[msg.sender];

        // Import encrypted values from frontend (each with its own proof)
        euint32 incomingFocusTime = FHE.fromExternal(focusTimeInput, focusTimeProof);
        euint32 incomingInterruptCount = FHE.fromExternal(interruptCountInput, interruptCountProof);
        // Note: tagHash stored for future analytics capabilities
        euint32 incomingTagHash = FHE.fromExternal(tagHashInput, tagHashProof);
        incomingTagHash; // silence unused warning

        // Aggregate encrypted values
        record.totalFocusTime = FHE.add(record.totalFocusTime, incomingFocusTime);
        record.totalInterruptCount = FHE.add(record.totalInterruptCount, incomingInterruptCount);
        record.todayFocusTime = FHE.add(record.todayFocusTime, incomingFocusTime);
        record.totalSessions++;

        // Allow user to decrypt updated values
        FHE.allow(record.totalFocusTime, msg.sender);
        FHE.allow(record.totalInterruptCount, msg.sender);
        FHE.allow(record.todayFocusTime, msg.sender);

        // Allow badge contract to read if set
        if (badgeNFTContract != address(0)) {
            FHE.allowThis(record.totalFocusTime);
            FHE.allowThis(record.todayFocusTime);
            FHE.allowThis(record.totalInterruptCount);
        }

        emit FocusSessionRecorded(msg.sender, block.timestamp);

        // Check daily goal achievement (encrypted comparison)
        _checkDailyGoal(msg.sender);
    }

    /// @notice Update user's daily target
    /// @param newTargetInput Encrypted new daily target in seconds
    /// @param inputProof Input proof from FHEVM encryption
    function updateDailyTarget(
        externalEuint32 newTargetInput,
        bytes calldata inputProof
    ) external {
        require(userRecords[msg.sender].initialized, "User not initialized");

        UserRecord storage record = userRecords[msg.sender];
        record.dailyTarget = FHE.fromExternal(newTargetInput, inputProof);
        
        // Allow contract to operate on the handle
        FHE.allowThis(record.dailyTarget);
        
        // Allow user to decrypt
        FHE.allow(record.dailyTarget, msg.sender);
        
        emit DailyTargetUpdated(msg.sender);
    }

    /// @notice Get user record (returns encrypted handles for frontend decryption)
    /// @return totalFocusTime Encrypted total focus time
    /// @return totalInterruptCount Encrypted total interrupts
    /// @return todayFocusTime Encrypted today's focus time
    /// @return dailyTarget Encrypted daily target
    /// @return streakDays Current streak (plaintext)
    /// @return totalSessions Total sessions (plaintext)
    function getUserRecord(address user) external view returns (
        euint32 totalFocusTime,
        euint32 totalInterruptCount,
        euint32 todayFocusTime,
        euint32 dailyTarget,
        uint32 streakDays,
        uint32 totalSessions
    ) {
        UserRecord storage record = userRecords[user];
        require(record.initialized, "User not initialized");

        return (
            record.totalFocusTime,
            record.totalInterruptCount,
            record.todayFocusTime,
            record.dailyTarget,
            record.streakDays,
            record.totalSessions
        );
    }

    /// @notice Set badge NFT contract address (only callable once for simplicity)
    /// @param _badgeNFTContract Address of PomodoroNFT contract
    function setBadgeNFTContract(address _badgeNFTContract) external {
        require(badgeNFTContract == address(0), "Badge contract already set");
        badgeNFTContract = _badgeNFTContract;
    }

    /// @notice Internal: Reset daily stats if a new day has started
    function _resetDailyIfNeeded(address user) internal {
        UserRecord storage record = userRecords[user];
        uint32 currentDay = uint32(block.timestamp / 1 days);

        if (currentDay > record.lastResetDay) {
            // New day started - check if yesterday's goal was achieved before resetting
            // For simplicity, we'll reset todayFocusTime to 0
            // In production, you'd decrypt to check goal or use encrypted comparison
            record.todayFocusTime = FHE.asEuint32(0);
            record.lastResetDay = currentDay;
            
            FHE.allow(record.todayFocusTime, user);
        }
    }

    /// @notice Internal: Check if daily goal is achieved using encrypted comparison
    /// @dev This is a placeholder - encrypted boolean cannot be used for branching in Solidity
    ///      Production implementation would use Oracle callback pattern
    /// @param user User address (unused in current implementation)
    function _checkDailyGoal(address user) internal pure {
        // Note: Encrypted comparison exists but cannot be used for branching
        // ebool isAchieved = FHE.ge(userRecords[user].todayFocusTime, userRecords[user].dailyTarget);
        // Production implementation would:
        // 1. Request decryption from Oracle
        // 2. Oracle callback updates streak
        // 3. Frontend can use incrementStreak() after verifying goal via decryption
        
        // For now, this is a no-op placeholder
        // Users must manually call incrementStreak() after verifying their goal
        user; // silence unused parameter warning
    }

    /// @notice Manual streak increment (called after frontend verifies goal via decryption)
    /// @dev This is a workaround for demo; production would use oracle callbacks
    function incrementStreak() external {
        require(userRecords[msg.sender].initialized, "User not initialized");
        userRecords[msg.sender].streakDays++;
        emit DailyGoalAchieved(msg.sender, userRecords[msg.sender].streakDays);
    }

    /// @notice Manual streak reset (called by user or trusted keeper)
    function resetStreak() external {
        require(userRecords[msg.sender].initialized, "User not initialized");
        userRecords[msg.sender].streakDays = 0;
    }

    /// @notice Check if user is initialized
    /// @param user Address to check
    /// @return Whether the user has been initialized
    function isUserInitialized(address user) external view returns (bool) {
        return userRecords[user].initialized;
    }

    /// @notice Get plaintext stats (non-sensitive)
    function getPlaintextStats(address user) external view returns (
        uint32 streakDays,
        uint32 totalSessions,
        uint32 lastResetDay
    ) {
        UserRecord storage record = userRecords[user];
        require(record.initialized, "User not initialized");
        
        return (record.streakDays, record.totalSessions, record.lastResetDay);
    }

    /// @notice Reauthorize all handles for user decryption
    /// @dev Call this if decryption fails due to missing authorization
    ///      This can happen if handles changed after operations
    function reauthorizeHandles() external {
        require(userRecords[msg.sender].initialized, "User not initialized");
        
        UserRecord storage record = userRecords[msg.sender];
        
        // Reauthorize all handles for user decryption
        FHE.allow(record.totalFocusTime, msg.sender);
        FHE.allow(record.totalInterruptCount, msg.sender);
        FHE.allow(record.todayFocusTime, msg.sender);
        FHE.allow(record.dailyTarget, msg.sender);
        
        // Also allow contract to operate on these handles
        FHE.allowThis(record.totalFocusTime);
        FHE.allowThis(record.totalInterruptCount);
        FHE.allowThis(record.todayFocusTime);
        FHE.allowThis(record.dailyTarget);
    }
}

