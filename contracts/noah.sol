// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol"; 

/**
 * @title Noah
 * @notice A dead man's switch contract to transfer a user's tokens to a beneficiary after a set time.
 */
contract Noah {

    /**
     * @notice The Ark struct represents a user's dead man's switch configuration.
     * @param beneficiary The address that will receive the tokens when the flood is triggered.
     * @param deadline The Unix timestamp after which the Ark can be flooded.
     * @param deadlineDuration The duration in seconds used to calculate new deadlines on ping.
     * @param tokens The array of ERC20 token addresses managed by this Ark.
     */
    struct Ark {
        address beneficiary;
        uint256 deadline;
        uint256 deadlineDuration;
        address[] tokens;
    }

    /**
     * @notice Mapping from user address to their Ark configuration.
     * @dev Each user can only have one Ark at a time. A deadline of 0 indicates no active Ark.
     */
    mapping(address => Ark) public arks;

    /**
     * @notice Emitted when a new Ark is created.
     * @param user The address of the user who built the Ark.
     * @param beneficiary The address designated to receive tokens.
     * @param deadline The initial deadline timestamp for the Ark.
     */
    event ArkBuilt(address indexed user, address indexed beneficiary, uint256 deadline);

    /**
     * @notice Emitted when an Ark's deadline is reset via ping.
     * @param user The address of the user who pinged their Ark.
     * @param newDeadline The updated deadline timestamp.
     */
    event ArkPinged(address indexed user, uint256 newDeadline);

    /**
     * @notice Emitted when a flood is triggered and tokens are transferred to the beneficiary.
     * @param user The address of the user whose Ark was flooded.
     * @param beneficiary The address that received the tokens.
     */
    event FloodTriggered(address indexed user, address indexed beneficiary);

    /**
     * @notice Emitted when new tokens are added to an Ark.
     * @param user The address of the user who added passengers.
     * @param newPassengers The array of token addresses that were added.
     */
    event PassengersAdded(address indexed user, address[] newPassengers);

    /**
     * @notice Emitted when a token is removed from an Ark.
     * @param user The address of the user who removed the passenger.
     * @param passenger The token address that was removed.
     */
    event PassengerRemoved(address indexed user, address passenger);

    /**
     * @notice Emitted when the deadline duration is updated.
     * @param user The address of the user who updated the duration.
     * @param newDuration The new duration in seconds.
     * @param newDeadline The recalculated deadline timestamp.
     */
    event DeadlineUpdated(address indexed user, uint256 newDuration, uint256 newDeadline);

    /**
     * @notice Emitted when an Ark is destroyed by the user.
     * @param user The address of the user who destroyed their Ark.
     */
    event ArkDestroyed(address indexed user);


    constructor() {
    }

    // Custom getter for Ark data
    function getArk(address user) external view returns (address beneficiary, uint256 deadline, uint256 deadlineDuration, address[] memory tokens) {
        Ark storage ark = arks[user];
        return (ark.beneficiary, ark.deadline, ark.deadlineDuration, ark.tokens);
    }

    /**
     * @notice Builds an Ark for the caller.
     * @param _beneficiary The address to receive the funds.
     * @param _deadlineDuration The time in seconds to wait before the Ark can be triggered.
     * @param _tokens The list of token addresses to be managed.
     */
    function buildArk(address _beneficiary, uint256 _deadlineDuration, address[] calldata _tokens) external {
        require(arks[msg.sender].deadline == 0, "Account already initialized");
        require(_beneficiary != address(0), "Beneficiary cannot be the zero address");
        require(_deadlineDuration > 0, "Deadline duration must be greater than zero");

        // Create a temporary struct and assign it to the mapping
        Ark memory tempArk = Ark({
            beneficiary: _beneficiary,
            deadline: block.timestamp + _deadlineDuration,
            deadlineDuration: _deadlineDuration,
            tokens: _tokens
        });
        
        arks[msg.sender] = tempArk;

        emit ArkBuilt(msg.sender, _beneficiary, block.timestamp + _deadlineDuration);
    }

    /**
     * @notice Pings an Ark to reset its timer.
     */
    function pingArk() external {
        require(arks[msg.sender].deadline != 0, "Account not initialized");
        
        uint256 newDeadline = block.timestamp + arks[msg.sender].deadlineDuration;
        arks[msg.sender].deadline = newDeadline;

        emit ArkPinged(msg.sender, newDeadline);
    }

    /**
     * @notice Triggers the flood process for a user
     * @param _user The address of the user whose assets are being recovered.
     */
    function flood(address _user) external {
        Ark storage account = arks[_user];
        require(account.deadline != 0, "Account not initialized");
        require(block.timestamp >= account.deadline, "Deadline has not passed");


        for (uint i = 0; i < account.tokens.length; i++) {
            address tokenAddress = account.tokens[i];

            IERC20 token = IERC20(tokenAddress);
            uint256 userBalance = token.balanceOf(_user);
            if (userBalance > 0) {
                IERC20(tokenAddress).transfer(account.beneficiary, userBalance);
            }
        }
        // Reset the deadline to 0 to allow for future re-initialization
        account.deadline = 0;
        emit FloodTriggered(_user, account.beneficiary);
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

    /**
     * @notice Destroys the caller's Ark by setting the deadline to 0.
     * @dev This allows the user to create a new Ark after destruction.
     */
    function destroyArk() external {
        require(arks[msg.sender].deadline != 0, "Ark not built");
        arks[msg.sender].deadline = 0;
        emit ArkDestroyed(msg.sender);
    }
}