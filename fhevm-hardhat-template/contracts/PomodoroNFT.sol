// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title PomodoroNFT
/// @notice Badge NFT contract for achievement rewards
/// @dev Simple NFT-like badge system (not ERC721 for simplicity)
contract PomodoroNFT is ZamaEthereumConfig {
    /// @notice Badge metadata
    struct Badge {
        uint8 badgeId;        // Badge type ID (1-5)
        string name;          // Badge name
        string description;   // Badge description
        uint256 unlockedAt;   // Timestamp when unlocked
    }

    /// @notice Core contract reference
    /// @dev Set once during deployment
    address public coreContract;

    /// @notice Badge definitions
    mapping(uint8 => string) public badgeNames;
    mapping(uint8 => string) public badgeDescriptions;
    mapping(uint8 => uint32) public badgeThresholds; // Plaintext thresholds for simplicity

    /// @notice User badges: user => badgeId => unlocked
    mapping(address => mapping(uint8 => bool)) public userBadges;

    /// @notice User badge list
    mapping(address => uint8[]) public userBadgeList;

    /// @notice Events
    event BadgeUnlocked(address indexed user, uint8 indexed badgeId, uint256 timestamp);
    event CoreContractSet(address indexed coreContract);

    constructor() {
        // Initialize badge definitions
        badgeNames[1] = "Beginner";
        badgeDescriptions[1] = "Complete your first Pomodoro session";
        badgeThresholds[1] = 1; // 1 session

        badgeNames[2] = "Focused";
        badgeDescriptions[2] = "Accumulate 10 hours of focus time";
        badgeThresholds[2] = 36000; // 10 hours in seconds

        badgeNames[3] = "Persistent";
        badgeDescriptions[3] = "Achieve 7-day streak";
        badgeThresholds[3] = 7; // 7 days

        badgeNames[4] = "Iron Will";
        badgeDescriptions[4] = "Achieve 30-day streak";
        badgeThresholds[4] = 30; // 30 days

        badgeNames[5] = "Zero Distraction";
        badgeDescriptions[5] = "Complete a day with zero interrupts";
        badgeThresholds[5] = 0; // Special case
    }

    /// @notice Set core contract address (only once)
    function setCoreContract(address _coreContract) external {
        require(coreContract == address(0), "Core contract already set");
        coreContract = _coreContract;
        emit CoreContractSet(_coreContract);
    }

    /// @notice Check and unlock badges for user
    /// @dev Called by frontend after user completes session
    /// @param user User address
    /// @param totalSessions Total sessions (from core contract)
    /// @param streakDays Current streak (from core contract)
    function checkAndUnlockBadges(
        address user,
        uint32 totalSessions,
        uint32 streakDays
    ) external {
        // Badge 1: Beginner (1 session)
        if (totalSessions >= 1 && !userBadges[user][1]) {
            _unlockBadge(user, 1);
        }

        // Badge 3: Persistent (7-day streak)
        if (streakDays >= 7 && !userBadges[user][3]) {
            _unlockBadge(user, 3);
        }

        // Badge 4: Iron Will (30-day streak)
        if (streakDays >= 30 && !userBadges[user][4]) {
            _unlockBadge(user, 4);
        }

        // Note: Badge 2 (10 hours) and Badge 5 (zero interrupts) 
        // require decryption in production; simplified here
    }

    /// @notice Manual badge unlock (for badges requiring decryption verification)
    /// @param user User address
    /// @param badgeId Badge ID to unlock
    function unlockBadge(address user, uint8 badgeId) external {
        require(badgeId >= 1 && badgeId <= 5, "Invalid badge ID");
        require(!userBadges[user][badgeId], "Badge already unlocked");
        _unlockBadge(user, badgeId);
    }

    /// @notice Internal: Unlock badge for user
    function _unlockBadge(address user, uint8 badgeId) internal {
        userBadges[user][badgeId] = true;
        userBadgeList[user].push(badgeId);
        emit BadgeUnlocked(user, badgeId, block.timestamp);
    }

    /// @notice Get user's unlocked badges
    function getUserBadges(address user) external view returns (uint8[] memory) {
        return userBadgeList[user];
    }

    /// @notice Check if user has specific badge
    function hasBadge(address user, uint8 badgeId) external view returns (bool) {
        return userBadges[user][badgeId];
    }

    /// @notice Get badge info
    function getBadgeInfo(uint8 badgeId) external view returns (
        string memory name,
        string memory description,
        uint32 threshold
    ) {
        require(badgeId >= 1 && badgeId <= 5, "Invalid badge ID");
        return (badgeNames[badgeId], badgeDescriptions[badgeId], badgeThresholds[badgeId]);
    }

    /// @notice Get all badge info for display
    function getAllBadges() external view returns (
        uint8[] memory ids,
        string[] memory names,
        string[] memory descriptions
    ) {
        ids = new uint8[](5);
        names = new string[](5);
        descriptions = new string[](5);

        for (uint8 i = 1; i <= 5; i++) {
            ids[i-1] = i;
            names[i-1] = badgeNames[i];
            descriptions[i-1] = badgeDescriptions[i];
        }

        return (ids, names, descriptions);
    }
}

