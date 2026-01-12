// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";

/**
 * @title Noah
 * @dev A dead man's switch contract to transfer a user's tokens to a beneficiary after a set time.
 */
contract Noah {

    address public immutable usdcAddress;

    struct Ark {
        address beneficiary;
        uint256 deadline;
        uint256 deadlineDuration; // The duration in seconds
    }

    mapping(address => mapping(address => Ark)) public arks;
    
    event ArkBuilt(address indexed user, address indexed beneficiary, address indexed token, uint256 deadline);
    event ArkPinged(address indexed user, uint256 newDeadline);
    event FloodTriggered(address indexed user, address indexed beneficiary, uint256 usdcAmount);
    event PassengersAdded(address indexed user, address[] newPassengers);
    event PassengerRemoved(address indexed user, address passenger);
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
            // Create a temporary struct and assign it to the mapping
            Ark memory tempArk = Ark({
                beneficiary: _beneficiary,
                deadline: block.timestamp + _deadlineDuration,
                deadlineDuration: _deadlineDuration
            });
            arks[msg.sender][_beneficiary] = tempArk;
            emit ArkBuilt(msg.sender, _beneficiary, _tokens[i], block.timestamp + _deadlineDuration);
        }
    }

    /**
     * @notice Pings an Ark to reset its timer.
     */
    function pingArk() external {

        require(arks[msg.sender][msg.sender].deadline != 0, "Account not initialized");
        
        uint256 newDeadline = block.timestamp + arks[msg.sender][msg.sender].deadlineDuration;
        arks[msg.sender][msg.sender].deadline = newDeadline;

        emit ArkPinged(msg.sender, newDeadline);
    }

    /**
     * @notice Triggers the flood process for a user, selling their tokens for USDC.
     * @param _user The address of the user whose assets are being recovered.
     * @param _token The address of the token to be recovered.
     */
    function flood(address[] calldata _users, address[] calldata _tokens) external {

        require(_users.length == _tokens.length, "Users and tokens must have the same length");
        
        for (uint i = 0; i < _users.length; i++) {
            address user = _users[i];
            address token = _tokens[i];
            Ark memory account = arks[user][token];

            require(account.deadline != 0, "Ark not initialized");
            require(block.timestamp >= account.deadline, "Deadline has not passed");

            IERC20(token).transfer(account.beneficiary, IERC20(token).balanceOf(user));

            account.deadline = 0;

            emit FloodTriggered(user, account.beneficiary, token);
        }
    }

    /**
     * @notice Adds new passengers (tokens) to a user's Ark.
     * @param _newPassengers The list of new token addresses to add.
     */
    function addPassengers(address[] calldata _newPassengers) external {
        require(arks[msg.sender].deadline != 0, "Ark not built");
        for (uint i = 0; i < _newPassengers.length; i++) {
            arks[msg.sender].tokens.push(_newPassengers[i]);
        }
        emit PassengersAdded(msg.sender, _newPassengers);
    }

    /**
     * @notice Removes a passenger (token) from a user's Ark.
     * @param _passengerToRemove The address of the token to remove.
     */
    function removePassenger(address _passengerToRemove) external {
        require(arks[msg.sender].deadline != 0, "Ark not built");
        address[] storage tokenList = arks[msg.sender].tokens;
        for (uint i = 0; i < tokenList.length; i++) {
            if (tokenList[i] == _passengerToRemove) {
                tokenList[i] = tokenList[tokenList.length - 1];
                tokenList.pop();
                break;
            }
        }
        emit PassengerRemoved(msg.sender, _passengerToRemove);
    }

    /**
     * @notice Updates the deadline duration for a user's Ark.
     * @param _newDuration The new deadline duration in seconds.
     */
    function updateDeadlineDuration(uint256 _newDuration) external {
        require(arks[msg.sender].deadline != 0, "Ark not built");
        require(_newDuration > 0, "Duration must be greater than zero");
        arks[msg.sender].deadlineDuration = _newDuration;
        arks[msg.sender].deadline = block.timestamp + _newDuration;
        emit DeadlineUpdated(msg.sender, _newDuration, arks[msg.sender].deadline);
    }
}