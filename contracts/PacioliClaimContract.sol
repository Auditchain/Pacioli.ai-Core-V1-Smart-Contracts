// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract PacioliClaimContract is
    Initializable,
    Ownable2StepUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    using EnumerableSet for EnumerableSet.AddressSet;

    struct Recipient {
        uint256 ownedNodes;
        uint256 audtMissedRewardsPerNode;
        uint256 usdcMissedRewardsPerNode;
        uint256 audtAccumulatedReward;
        uint256 usdcAccumulatedReward;
    }

    /// @dev Reward cannot be added before any nodes are purchased.
    error NoOwnedNodes();

    /// @dev Cannot invoke function with zero address.
    error ZeroAddress();

    /// @dev Asset transfer has to be performed between different addresses.
    error SameAddressTransfer();

    /// @dev Vote had to be given to different addresses.
    error SameAddressRetraction();

    /// @dev Account unauthorized to perform the action.
    error UnauthorizedAccount();

    /// @dev Contract must have an owner at all times.
    error CannotRenounceOwnership();

    /// @dev No reward added yet.
    error NoRewardAdded();

    /// @dev No reward earned yet.
    error NoRewardEarned();

    /// @dev Already voted for the specified transfer.
    error AlreadyVoted();

    /// @dev Emitted upon successful reward addition.
    event RewardAdded(
        uint256 audtAmount,
        uint256 audtRewardPerUnitTotal,
        uint256 audtRewardPerUnitAdded,
        uint256 usdcAmount,
        uint256 usdcRewardPerUnitTotal,
        uint256 usdcRewardPerUnitAdded
    );

    /// @dev Emitted upon successful owned node addition.
    event NodesOwnedChanged(
        address indexed _address,
        uint256 oldOwned,
        uint256 newOwned
    );

    /// @dev Emitted upon successful reward withdrawal.
    event RewardWithdrawn(
        address indexed recipient,
        uint256 audtWithdrawnReward,
        uint256 usdcWithdrawnReward
    );

    /// @dev Emitted upon successful reward and node transfer.
    event RewardAndNodesTransferred(
        address from,
        address to,
        uint256 nodesTransferred,
        uint256 audtRewardTransferred,
        uint256 usdcRewardTransferred
    );

    /// @dev Emitted upon successful admin addition.
    event AdminAdded(address _address);

    /// @dev Emitted upon successful admin removal.
    event AdminRemoved(address _address);

    /// @dev Emitted upon successful vote for reward and nodes transfer.
    event RewardAndNodesTransferVoteGiven(
        address voter,
        address from,
        address to,
        uint256 totalVotes
    );

    /// @dev Emitted upon successful vote retraction of a reward and node transfer.
    event RewardAndNodesTransferVoteRetracted(
        address voter,
        address from,
        address to,
        uint256 totalVotes
    );

    /// @dev Emitted upon successful change of manager contract.
    event ManagerChanged(
        address indexed oldManager,
        address indexed newManager
    );

    uint256 internal constant FALSE = 1;
    uint256 internal constant TRUE = 2;

    EnumerableSet.AddressSet internal s_admins;
    mapping(address => Recipient) internal s_recipients;
    mapping(bytes32 => uint256) internal s_rewardTransferVoteCounts;
    mapping(address => mapping(bytes32 => uint256))
        internal s_rewardTransferVotes;

    /// @dev The contract that has manager privileges.
    address public s_manager;

    /// @dev Total nodes currently owned by recipients.
    uint256 public s_totalNodes;

    /// @dev AUDT token contract.
    IERC20 public s_audtTokenContract;

    /// @dev USDC token contract.
    IERC20 public s_usdcTokenContract;

    /// @dev All-time AUDT reward per node owned.
    uint256 public s_audtRewardPerNode;

    /// @dev All-time USDC reward per node owned.
    uint256 public s_usdcRewardPerNode;

    modifier onlyAdmins() {
        if (!s_admins.contains(msg.sender)) revert UnauthorizedAccount();
        _;
    }

    modifier onlyManager() {
        if (msg.sender != s_manager) revert UnauthorizedAccount();
        _;
    }

    /**
     * @dev Sets the initial state of the contract.
     * @dev Sets the `msg.sender` as the owner and adds it to admins.
     * @param audt Address of the AUDT ERC20 contract.
     * @param usdc Address of the USDC ERC20 contract.
     */
    function initialize(address audt, address usdc) public virtual initializer {
        s_audtTokenContract = IERC20(audt);
        s_usdcTokenContract = IERC20(usdc);
        s_admins.add(msg.sender);
        __Ownable_init(msg.sender);
    }

    /**
     * @dev Accepts the ownership transfer.
     * @dev Removes the current owner from the admin set and adds the new one (if they weren't already an admin).
     * @inheritdoc Ownable2StepUpgradeable
     */
    function acceptOwnership() public virtual override {
        address currentOwner = owner();
        address newOwner = msg.sender;

        super.acceptOwnership();

        if (s_admins.remove(currentOwner)) emit AdminRemoved(currentOwner);
        if (s_admins.add(newOwner)) emit AdminAdded(newOwner);
    }

    /**
     * @dev Ownership cannot be renounced.
     */
    function renounceOwnership() public view virtual override onlyOwner {
        revert CannotRenounceOwnership();
    }

    /**
     * @dev Allows the owner to set a new manager for the contract.
     * Emits `ManagerChanged` event.
     * @param newManager The address of the new manager to be set.
     */
    function setManager(address newManager) external virtual onlyOwner {
        address oldManager = s_manager;
        s_manager = newManager;
        emit ManagerChanged(oldManager, newManager);
    }

    /**
     * @dev Adds the desired reward amounts to the contract and adjusts the reward to be recieved per node.
     * The allowance to spend the desired amount of AUDT/USDC has to be given to the **proxy contract** first.
     * The reason for this is because the tokens are transferred using openzeppelin's `safeTransferFrom` function.
     * @param audtAmount Number of AUDT tokens added to reward.
     * @param usdcAmount Number of USDC tokens added to reward.
     */
    function addReward(
        uint256 audtAmount,
        uint256 usdcAmount
    ) external virtual onlyAdmins {
        if (s_totalNodes == 0) {
            revert NoOwnedNodes();
        }

        if (audtAmount > 0) {
            unchecked {
                s_audtRewardPerNode += audtAmount / s_totalNodes;
            }

            s_audtTokenContract.safeTransferFrom(
                msg.sender,
                address(this),
                audtAmount
            );
        }

        if (usdcAmount > 0) {
            unchecked {
                s_usdcRewardPerNode += usdcAmount / s_totalNodes;
            }
            s_usdcTokenContract.safeTransferFrom(
                msg.sender,
                address(this),
                usdcAmount
            );
        }

        emit RewardAdded(
            audtAmount,
            s_audtRewardPerNode,
            audtAmount / s_totalNodes,
            usdcAmount,
            s_usdcRewardPerNode,
            usdcAmount / s_totalNodes
        );
    }

    /**
     * @dev Accumulates and withdraws rewards for the `msg.sender`.
     * Reverts with `NoRewardAdded` and `NoRewardEarned` errors.
     * Emits `RewardWithdrawn` event.
     */
    function withdrawReward() external virtual {
        if (0 == s_audtRewardPerNode && 0 == s_usdcRewardPerNode)
            revert NoRewardAdded();

        _accumulateReward(msg.sender);

        uint256 totalAudtAccumulated = s_recipients[msg.sender]
            .audtAccumulatedReward;
        uint256 totalUsdcAccumulated = s_recipients[msg.sender]
            .usdcAccumulatedReward;

        if (0 == totalAudtAccumulated && 0 == totalUsdcAccumulated)
            revert NoRewardEarned();

        s_recipients[msg.sender].audtAccumulatedReward = 0;
        s_recipients[msg.sender].usdcAccumulatedReward = 0;

        s_audtTokenContract.safeTransfer(msg.sender, totalAudtAccumulated);
        s_usdcTokenContract.safeTransfer(msg.sender, totalUsdcAccumulated);

        emit RewardWithdrawn(
            msg.sender,
            totalAudtAccumulated,
            totalUsdcAccumulated
        );
    }

    /**
     * @dev Transfer the reward from one address to another if the majority of admins agree.
     * This method is to be used if and only if the recipient loses their private key.
     * Rewards and nodes **cannot be transferred from the same address twice**.
     * This means that even if the recipient recoveres their private key after assets have been
     * transferred, they should continue using their new address. Reason being that if they lose their
     * new key, assets can be transferred from the new address, but if they lose their original
     * key again, their assets **will be lost**.
     * @param from Address to transfer accumulated reward and nodes from.
     * @param to Address to transfer accumulated reward and nodes to.
     */
    function transferReward(
        address from,
        address to
    ) external virtual onlyAdmins {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        if (from == to) revert SameAddressTransfer();

        bytes32 voteKey = keccak256(abi.encodePacked(from, to));

        if (TRUE == s_rewardTransferVotes[msg.sender][voteKey])
            revert AlreadyVoted();

        unchecked {
            s_rewardTransferVotes[msg.sender][voteKey] = TRUE;
            s_rewardTransferVoteCounts[voteKey] += 1;
        }

        emit RewardAndNodesTransferVoteGiven(
            msg.sender,
            from,
            to,
            s_rewardTransferVoteCounts[voteKey]
        );

        uint256 majorityThreshold = (s_admins.length() >> 1) + 1;
        if (s_rewardTransferVoteCounts[voteKey] < majorityThreshold) return;

        uint256 nodesToTransfer = s_recipients[from].ownedNodes;
        uint256 totalNodesOwned = s_recipients[to].ownedNodes + nodesToTransfer;

        _accumulateReward(from);
        _accumulateReward(to);
        _addAddress(from, 0);
        _addAddress(to, totalNodesOwned);

        uint256 audtAccumulated = s_recipients[from].audtAccumulatedReward;
        uint256 usdcAccumulated = s_recipients[from].usdcAccumulatedReward;

        unchecked {
            s_recipients[from].audtAccumulatedReward = 0;
            s_recipients[from].usdcAccumulatedReward = 0;

            s_recipients[to].audtAccumulatedReward += audtAccumulated;
            s_recipients[to].usdcAccumulatedReward += usdcAccumulated;
        }

        emit RewardAndNodesTransferred(
            from,
            to,
            nodesToTransfer,
            audtAccumulated,
            usdcAccumulated
        );
    }

    /**
     * @dev Retracts a vote given to transfer the reward and nodes.
     * The vote count will be lowered by one, and the vote can be regiven later.
     * @param from Address from which the reward and nodes were to be transferred.
     * @param to Address to which the reward and nodes were to be transferred.
     */
    function retractTransferRewardVote(
        address from,
        address to
    ) external virtual onlyAdmins {
        if (from == address(0) || to == address(0)) revert ZeroAddress();
        if (from == to) revert SameAddressRetraction();

        bytes32 voteKey = keccak256(abi.encodePacked(from, to));

        if (
            0 == s_rewardTransferVotes[msg.sender][voteKey] || // vote was never given or
            FALSE == s_rewardTransferVotes[msg.sender][voteKey] // it was retracted already
        ) return;

        unchecked {
            s_rewardTransferVotes[msg.sender][voteKey] = FALSE;
            s_rewardTransferVoteCounts[voteKey] -= 1;
        }

        emit RewardAndNodesTransferVoteRetracted(
            msg.sender,
            from,
            to,
            s_rewardTransferVoteCounts[voteKey]
        );
    }

    /**
     * @dev Adds the specified address as admin, unlocking onlyAdmins functions for it.
     * @param _address Address of the admin to be added.
     */
    function addAdmin(address _address) external virtual onlyOwner {
        if (_address == address(0)) revert ZeroAddress();
        if (s_admins.add(_address)) emit AdminAdded(_address);
    }

    /**
     * @dev Removes the specified address from admins, locking onlyAdmins functions for it.
     * @param _address Address of the admin to be removed.
     */
    function removeAdmin(address _address) external virtual onlyOwner {
        if (_address == address(0)) revert ZeroAddress();
        if (s_admins.remove(_address)) emit AdminRemoved(_address);
    }

    /**
     * @dev Sets the owned nodes of the recipient to the given value.
     * It is expected that the `newOwnedNodes` is already raised to the power of `decimals()`.
     * @param _address Recipient address from whom the nodes will be set.
     * @param newOwnedNodes New percentage of nodes that will belong to address.
     */
    function setOwnedNodes(
        address _address,
        uint256 newOwnedNodes
    ) external virtual onlyAdmins {
        if (_address == address(0)) revert ZeroAddress();

        uint256 oldOwnedNodes = s_recipients[_address].ownedNodes;
        _accumulateReward(_address);
        _addAddress(_address, newOwnedNodes);

        emit NodesOwnedChanged(_address, oldOwnedNodes, newOwnedNodes);
    }

    /**
     * @dev Calculates the reward that can be withdrawn by `msg.sender`.
     * @return AUDT tokens reward that can be withdrawn.
     * @return USDC tokens reward that can be withdrawn.
     */
    function getAccumulatedReward()
        external
        view
        virtual
        returns (uint256, uint256)
    {
        (
            uint256 newlyAudtAccumulated,
            uint256 newlyUsdcAccumulated
        ) = _getAccumulatedReward(msg.sender);

        uint256 totalAudtAccumulated = s_recipients[msg.sender]
            .audtAccumulatedReward + newlyAudtAccumulated;
        uint256 totalUsdcAccumulated = s_recipients[msg.sender]
            .usdcAccumulatedReward + newlyUsdcAccumulated;

        return (totalAudtAccumulated, totalUsdcAccumulated);
    }

    /**
     * @dev Returns how many nodes does `msg.sender` owns.
     * @return Number of nodes owned by `msg.sender`.
     */
    function getOwnedNodes() external view virtual returns (uint256) {
        return s_recipients[msg.sender].ownedNodes;
    }

    /**
     * @dev Calculates reward for the given address and adds it to its accumulated reward.
     * @param _address Address of the recipient whose reward should be accumulated.
     */
    function _accumulateReward(address _address) internal virtual {
        (
            uint256 newlyAudtAccumulated,
            uint256 newlyUsdcAccumulated
        ) = _getAccumulatedReward(_address);

        // User has not yet been added or has no nodes.
        if (0 == newlyAudtAccumulated && 0 == newlyUsdcAccumulated) return;

        // Update the missed reward per node to account
        // for the reward that has just been accumulated.
        s_recipients[_address].audtMissedRewardsPerNode = s_audtRewardPerNode;
        s_recipients[_address].usdcMissedRewardsPerNode = s_usdcRewardPerNode;

        unchecked {
            s_recipients[_address]
                .audtAccumulatedReward += newlyAudtAccumulated;
            s_recipients[_address]
                .usdcAccumulatedReward += newlyUsdcAccumulated;
        }
    }

    /**
     * @dev Adds (or updates if it already exists) the address as a recipient.
     * @param _address Address to be added as the recipient.
     * @param nodeCount Nodes that are to be owned by the specified address.
     */
    function _addAddress(address _address, uint256 nodeCount) internal virtual {
        uint256 audtAccumulatedReward = s_recipients[_address]
            .audtAccumulatedReward;
        uint256 usdcAccumulatedReward = s_recipients[_address]
            .usdcAccumulatedReward;

        // If the address already exists, their nodes have to
        // be subtracted first so when the new node count gets
        // added, there are no extra nodes that don't actually exist.
        // Eg. address owned 2 nodes, now they own 4, if we didn't subtract
        // 6 total nodes would've be added to the node count
        // (2 the first time it was added, and 4 now).
        if (s_recipients[_address].ownedNodes > 0) {
            unchecked {
                s_totalNodes -= s_recipients[_address].ownedNodes;
            }
        }

        s_recipients[_address] = Recipient({
            ownedNodes: nodeCount,
            audtMissedRewardsPerNode: s_audtRewardPerNode,
            usdcMissedRewardsPerNode: s_usdcRewardPerNode,
            audtAccumulatedReward: audtAccumulatedReward,
            usdcAccumulatedReward: usdcAccumulatedReward
        });

        unchecked {
            s_totalNodes += nodeCount;
        }
    }

    /**
     * @dev Helper function to accumulate reward for any address.
     * Returns only the newly accumulated reward.
     * @param _address Address whose reward should be accumulated.
     * @return AUDT tokens newly accumulated reward.
     * @return USDC tokens newly accumulated reward.
     */
    function _getAccumulatedReward(
        address _address
    ) internal view virtual returns (uint256, uint256) {
        uint256 ownedNodes = s_recipients[_address].ownedNodes;

        if (0 == ownedNodes) return (0, 0);

        uint256 newlyAudtAccumulated = ownedNodes *
            (s_audtRewardPerNode -
                s_recipients[_address].audtMissedRewardsPerNode);

        uint256 newlyUsdcAccumulated = ownedNodes *
            (s_usdcRewardPerNode -
                s_recipients[_address].usdcMissedRewardsPerNode);

        return (newlyAudtAccumulated, newlyUsdcAccumulated);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyOwner {}
}
