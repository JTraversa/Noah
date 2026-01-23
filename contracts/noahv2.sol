// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/**
 * @title Noah
 * @notice A dead man's switch contract to transfer a user's tokens to a beneficiary after a set time.
 */
contract Noah {

    /**
     * @notice The struct for the Ark.
     * @param beneficiary The address of the beneficiary.
     * @param deadline The deadline of the Ark.
     * @param deadlineDuration The deadline duration of the Ark.
     */
    struct Ark {
        address beneficiary;
        uint256 deadline;
        uint256 deadlineDuration; // The duration in seconds
    }

    /**
     * @notice The mapping of the Arks.
     * @notice user The address of the user.
     * @notice token The address of the token.
     */
    mapping(address => mapping(address => Ark)) public arks;
    
    /**
     * @notice The events for the Ark.
     * @param user The address of the user.
     * @param beneficiary The address of the beneficiary.
     * @param token The address of the token.
     * @param deadline The deadline of the Ark.
     */
    event ArkBuilt(address indexed user, address indexed beneficiary, address indexed token, uint256 deadline);

    /**
     * @notice The event for the Ark destroyed.
     * @param user The address of the user.
     * @param token The address of the token.
     */
    event ArkDestroyed(address indexed user, address indexed token);

    /**
     * @notice The event for the Ark pinged.
     * @param user The address of the user.
     * @param token The address of the token.
     * @param newDeadline The new deadline of the Ark.
     */
    event ArkPinged(address indexed user, address indexed token, uint256 newDeadline);

    /**
     * @notice The event for the Flood triggered.
     * @param user The address of the user.
     * @param beneficiary The address of the beneficiary.
     * @param tokenAmount The amount of token triggered.
     */
    event FloodTriggered(address indexed user, address indexed beneficiary, address indexed token, uint256 tokenAmount);

    /**
     * @notice The event for the Deadline updated.
     * @param user The address of the user.
     * @param newDuration The new duration of the Ark.
     * @param newDeadline The new deadline of the Ark.
     */
    event DeadlineUpdated(address indexed user, uint256 newDuration, uint256 newDeadline);

    constructor() {
    }

    // Custom getter for Ark data
    /**
     * @notice Gets the Ark data for a user and token.
     * @param user The address of the user.
     * @param token The address of the token.
     * @return beneficiary The address of the beneficiary.
     * @return deadline The deadline of the Ark.
     * @return deadlineDuration The deadline duration of the Ark.
     */
    function getArk(address user, address token) external view returns (address beneficiary, uint256 deadline, uint256 deadlineDuration) {

        Ark memory ark = arks[user][token];

        return (ark.beneficiary, ark.deadline, ark.deadlineDuration);
    }

    /**
     * @notice Builds an Ark for the caller.
     * @param _beneficiary The address to receive the funds.
     * @param _deadlineDuration The time in seconds to wait before the Ark can be triggered.
     * @param _tokens The list of token addresses to be managed.
     */
    function buildArk(address _beneficiary, uint256 _deadlineDuration, address[] calldata _tokens) external {

        require(arks[msg.sender][_beneficiary].deadline == 0, "Account already initialized");
        require(_deadlineDuration > 0, "Deadline duration must be greater than zero");

        for (uint i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];
            // Create a temporary struct and assign it to the mapping
            Ark memory tempArk = Ark({
                beneficiary: _beneficiary,
                deadline: block.timestamp + _deadlineDuration,
                deadlineDuration: _deadlineDuration
            });
            arks[msg.sender][token] = tempArk;

            emit ArkBuilt(msg.sender, _beneficiary, token, block.timestamp + _deadlineDuration);
        }
    }

    /**
     * @notice Destroys an Ark for the caller.
     * @param _token The address of the token whose Ark is being destroyed.
     */
    function destroyArk(address _token) external {

        require(arks[msg.sender][_token].deadline != 0, "Ark not built");

        arks[msg.sender][_token].deadline = 0;

        emit ArkDestroyed(msg.sender, _token);
    }

    /**
     * @notice Pings an Ark to reset its timer.
     * @param _tokens The list of token addresses to be pinged.
     */
    function pingArk(address[] calldata _tokens) external {

        for (uint i = 0; i < _tokens.length; i++) {
            address token = _tokens[i];

            require(arks[msg.sender][token].deadline != 0, "Account not initialized");

            arks[msg.sender][token].deadline = block.timestamp + arks[msg.sender][token].deadlineDuration;

            emit ArkPinged(msg.sender, token, block.timestamp + arks[msg.sender][token].deadlineDuration);
        }
    }

    /**
     * @notice Triggers the flood process for a user
     * @param _users The address of the users whose assets are being recovered.
     * @param _tokens The address of the tokens to be recovered.
     */
    function flood(address[] calldata _users, address[] calldata _tokens) external {

        require(_users.length == _tokens.length, "Users and tokens must have the same length");
        
        for (uint i = 0; i < _users.length; i++) {
            address user = _users[i];
            address token = _tokens[i];
            Ark memory account = arks[user][token];

            require(account.deadline != 0, "Ark not initialized");
            require(block.timestamp >= account.deadline, "Deadline has not passed");

            uint256 userBalance = IERC20(token).balanceOf(user);

            IERC20(token).transfer(account.beneficiary, userBalance);

            account.deadline = 0;

            emit FloodTriggered(user, account.beneficiary, token, userBalance);
        }
    }

    /**
     * @notice Updates the deadline duration for a user's Ark.
     * @param _token The address of the token whose Ark is being updated.
     * @param _newDuration The new deadline duration in seconds.
     */
    function updateDeadlineDuration(address _token, uint256 _newDuration) external {

        require(arks[msg.sender][_token].deadline != 0, "Ark not built");
        require(_newDuration > 0, "Duration must be greater than zero");

        arks[msg.sender][_token].deadlineDuration = _newDuration;
        arks[msg.sender][_token].deadline = block.timestamp + _newDuration;

        emit DeadlineUpdated(msg.sender, _newDuration, block.timestamp + _newDuration);
    }
}