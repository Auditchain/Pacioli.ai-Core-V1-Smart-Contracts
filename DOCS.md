# PacioliClaimContract

## Methods

### acceptOwnership

```solidity
function acceptOwnership() external nonpayable
```

Accepts the ownership transfer.

_Removes the current owner from the admin set and adds the new one (if they weren&#39;t already an admin)._

### addAdmin

```solidity
function addAdmin(address _address) external nonpayable
```

Adds the specified address as admin, unlocking onlyAdmins functions for it.

#### Parameters

| Name      | Type    | Description                       |
| --------- | ------- | --------------------------------- |
| \_address | address | Address of the admin to be added. |

### addReward

```solidity
function addReward(uint256 audtAmount, uint256 usdcAmount) external nonpayable
```

Adds the desired reward amounts to the contract and adjusts the reward to be recieved per node.

_The allowance to spend the desired amount of AUDT/USDC has to be given to the **proxy contract** first. The reason for this is because the tokens are transferred using openzeppelin&#39;s `safeTransferFrom` function._

#### Parameters

| Name       | Type    | Description                            |
| ---------- | ------- | -------------------------------------- |
| audtAmount | uint256 | Number of AUDT tokens added to reward. |
| usdcAmount | uint256 | Number of USDC tokens added to reward. |

### getAccumulatedReward

```solidity
function getAccumulatedReward() external view returns (uint256, uint256)
```

Calculates the reward that can be withdrawn by `msg.sender`.

#### Returns

| Name | Type    | Description                               |
| ---- | ------- | ----------------------------------------- |
| \_0  | uint256 | AUDT tokens reward that can be withdrawn. |
| \_1  | uint256 | USDC tokens reward that can be withdrawn. |

### getOwnedNodes

```solidity
function getOwnedNodes() external view returns (uint256)
```

Returns how many nodes `msg.sender` owns.

#### Returns

| Name | Type    | Description                            |
| ---- | ------- | -------------------------------------- |
| \_0  | uint256 | Number of nodes owned by `msg.sender`. |

### getOwnedNodesForAddress

```solidity
function getOwnedNodesForAddress(address _address) external view returns (uint256)
```

Returns how many nodes `_address` owns.

#### Parameters

| Name      | Type    | Description                                             |
| --------- | ------- | ------------------------------------------------------- |
| \_address | address | The address for which to get the number of nodes owned. |

#### Returns

| Name | Type    | Description                          |
| ---- | ------- | ------------------------------------ |
| \_0  | uint256 | Number of nodes owned by `_address`. |

### initialize

```solidity
function initialize(address audt, address usdc) external nonpayable
```

Sets the initial state of the contract.

_Sets the `msg.sender` as the owner and adds it to admins._

#### Parameters

| Name | Type    | Description                         |
| ---- | ------- | ----------------------------------- |
| audt | address | Address of the AUDT ERC20 contract. |
| usdc | address | Address of the USDC ERC20 contract. |

### owner

```solidity
function owner() external view returns (address)
```

_Returns the address of the current owner._

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### pendingOwner

```solidity
function pendingOwner() external view returns (address)
```

_Returns the address of the pending owner._

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### proxiableUUID

```solidity
function proxiableUUID() external view returns (bytes32)
```

_Implementation of the ERC-1822 {proxiableUUID} function. This returns the storage slot used by the implementation. It is used to validate the implementation&#39;s compatibility when performing an upgrade. IMPORTANT: A proxy pointing at a proxiable contract should not be considered proxiable itself, because this risks bricking a proxy that upgrades to it, by delegating to itself until out of gas. Thus it is critical that this function revert if invoked through a proxy. This is guaranteed by the `notDelegated` modifier._

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | bytes32 | undefined   |

### removeAdmin

```solidity
function removeAdmin(address _address) external nonpayable
```

Removes the specified address from admins, locking onlyAdmins functions for it.

#### Parameters

| Name      | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| \_address | address | Address of the admin to be removed. |

### renounceOwnership

```solidity
function renounceOwnership() external view
```

Ownership cannot be renounced.

### retractTransferRewardVote

```solidity
function retractTransferRewardVote(address from, address to) external nonpayable
```

Retracts a vote given to transfer the reward and nodes.

_The vote count will be lowered by one, and the vote can be regiven later._

#### Parameters

| Name | Type    | Description                                                     |
| ---- | ------- | --------------------------------------------------------------- |
| from | address | Address from which the reward and nodes were to be transferred. |
| to   | address | Address to which the reward and nodes were to be transferred.   |

### s_audtRewardPerNode

```solidity
function s_audtRewardPerNode() external view returns (uint256)
```

All-time AUDT reward per node owned.

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### s_audtTokenContract

```solidity
function s_audtTokenContract() external view returns (contract IERC20)
```

AUDT token contract.

#### Returns

| Name | Type            | Description |
| ---- | --------------- | ----------- |
| \_0  | contract IERC20 | undefined   |

### s_manager

```solidity
function s_manager() external view returns (address)
```

The contract that has manager privileges.

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | address | undefined   |

### s_totalNodes

```solidity
function s_totalNodes() external view returns (uint256)
```

Total nodes currently owned by recipients.

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### s_usdcRewardPerNode

```solidity
function s_usdcRewardPerNode() external view returns (uint256)
```

All-time USDC reward per node owned.

#### Returns

| Name | Type    | Description |
| ---- | ------- | ----------- |
| \_0  | uint256 | undefined   |

### s_usdcTokenContract

```solidity
function s_usdcTokenContract() external view returns (contract IERC20)
```

USDC token contract.

#### Returns

| Name | Type            | Description |
| ---- | --------------- | ----------- |
| \_0  | contract IERC20 | undefined   |

### setManager

```solidity
function setManager(address newManager) external nonpayable
```

#### Parameters

| Name       | Type    | Description |
| ---------- | ------- | ----------- |
| newManager | address | undefined   |

### setOwnedNodes

```solidity
function setOwnedNodes(address _address, uint256 newOwnedNodes) external nonpayable
```

Sets the owned nodes of the recipient to the given value.

_It is expected that the `newOwnedNodes` is already raised to the power of `decimals()`._

#### Parameters

| Name          | Type    | Description                                          |
| ------------- | ------- | ---------------------------------------------------- |
| \_address     | address | Recipient address from whom the nodes will be set.   |
| newOwnedNodes | uint256 | New percentage of nodes that will belong to address. |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```

_Starts the ownership transfer of the contract to a new account. Replaces the pending transfer if there is one. Can only be called by the current owner. Setting `newOwner` to the zero address is allowed; this can be used to cancel an initiated ownership transfer._

#### Parameters

| Name     | Type    | Description |
| -------- | ------- | ----------- |
| newOwner | address | undefined   |

### transferReward

```solidity
function transferReward(address from, address to) external nonpayable
```

Transfer the reward from one address to another if the majority of admins agree.

_This method is to be used if and only if the recipient loses their private key. Rewards and nodes **cannot be transferred from the same address twice**. This means that even if the recipient recoveres their private key after assets have been transferred, they should continue using their new address. Reason being that if they lose their new key, assets can be transferred from the new address, but if they lose their original key again, their assets **will be lost**._

#### Parameters

| Name | Type    | Description                                            |
| ---- | ------- | ------------------------------------------------------ |
| from | address | Address to transfer accumulated reward and nodes from. |
| to   | address | Address to transfer accumulated reward and nodes to.   |

### upgradeToAndCall

```solidity
function upgradeToAndCall(address newImplementation, bytes data) external payable
```

_Upgrade the implementation of the proxy to `newImplementation`, and subsequently execute the function call encoded in `data`. Calls {\_authorizeUpgrade}. Emits an {Upgraded} event._

#### Parameters

| Name              | Type    | Description |
| ----------------- | ------- | ----------- |
| newImplementation | address | undefined   |
| data              | bytes   | undefined   |

### withdrawReward

```solidity
function withdrawReward() external nonpayable
```

Accumulates and withdraws rewards for the `msg.sender`.

_Reverts with `NoRewardAdded` and `NoRewardEarned` errors. Emits `RewardWithdrawn` event._

## Events

### AdminAdded

```solidity
event AdminAdded(address _address)
```

_Emitted upon successful admin addition._

#### Parameters

| Name      | Type    | Description |
| --------- | ------- | ----------- |
| \_address | address | undefined   |

### AdminRemoved

```solidity
event AdminRemoved(address _address)
```

_Emitted upon successful admin removal._

#### Parameters

| Name      | Type    | Description |
| --------- | ------- | ----------- |
| \_address | address | undefined   |

### Initialized

```solidity
event Initialized(uint64 version)
```

_Triggered when the contract has been initialized or reinitialized._

#### Parameters

| Name    | Type   | Description |
| ------- | ------ | ----------- |
| version | uint64 | undefined   |

### ManagerChanged

```solidity
event ManagerChanged(address indexed oldManager, address indexed newManager)
```

_Emitted upon successful change of manager contract._

#### Parameters

| Name                 | Type    | Description |
| -------------------- | ------- | ----------- |
| oldManager `indexed` | address | undefined   |
| newManager `indexed` | address | undefined   |

### NodesOwnedChanged

```solidity
event NodesOwnedChanged(address indexed _address, uint256 oldOwned, uint256 newOwned)
```

_Emitted upon successful owned node addition._

#### Parameters

| Name                | Type    | Description |
| ------------------- | ------- | ----------- |
| \_address `indexed` | address | undefined   |
| oldOwned            | uint256 | undefined   |
| newOwned            | uint256 | undefined   |

### OwnershipTransferStarted

```solidity
event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner)
```

#### Parameters

| Name                    | Type    | Description |
| ----------------------- | ------- | ----------- |
| previousOwner `indexed` | address | undefined   |
| newOwner `indexed`      | address | undefined   |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```

#### Parameters

| Name                    | Type    | Description |
| ----------------------- | ------- | ----------- |
| previousOwner `indexed` | address | undefined   |
| newOwner `indexed`      | address | undefined   |

### RewardAdded

```solidity
event RewardAdded(uint256 audtAmount, uint256 audtRewardPerUnitTotal, uint256 audtRewardPerUnitAdded, uint256 usdcAmount, uint256 usdcRewardPerUnitTotal, uint256 usdcRewardPerUnitAdded)
```

_Emitted upon successful reward addition._

#### Parameters

| Name                   | Type    | Description |
| ---------------------- | ------- | ----------- |
| audtAmount             | uint256 | undefined   |
| audtRewardPerUnitTotal | uint256 | undefined   |
| audtRewardPerUnitAdded | uint256 | undefined   |
| usdcAmount             | uint256 | undefined   |
| usdcRewardPerUnitTotal | uint256 | undefined   |
| usdcRewardPerUnitAdded | uint256 | undefined   |

### RewardAndNodesTransferVoteGiven

```solidity
event RewardAndNodesTransferVoteGiven(address voter, address from, address to, uint256 totalVotes)
```

_Emitted upon successful vote for reward and nodes transfer._

#### Parameters

| Name       | Type    | Description |
| ---------- | ------- | ----------- |
| voter      | address | undefined   |
| from       | address | undefined   |
| to         | address | undefined   |
| totalVotes | uint256 | undefined   |

### RewardAndNodesTransferVoteRetracted

```solidity
event RewardAndNodesTransferVoteRetracted(address voter, address from, address to, uint256 totalVotes)
```

_Emitted upon successful vote retraction of a reward and node transfer._

#### Parameters

| Name       | Type    | Description |
| ---------- | ------- | ----------- |
| voter      | address | undefined   |
| from       | address | undefined   |
| to         | address | undefined   |
| totalVotes | uint256 | undefined   |

### RewardAndNodesTransferred

```solidity
event RewardAndNodesTransferred(address from, address to, uint256 nodesTransferred, uint256 audtRewardTransferred, uint256 usdcRewardTransferred)
```

_Emitted upon successful reward and node transfer._

#### Parameters

| Name                  | Type    | Description |
| --------------------- | ------- | ----------- |
| from                  | address | undefined   |
| to                    | address | undefined   |
| nodesTransferred      | uint256 | undefined   |
| audtRewardTransferred | uint256 | undefined   |
| usdcRewardTransferred | uint256 | undefined   |

### RewardWithdrawn

```solidity
event RewardWithdrawn(address indexed recipient, uint256 audtWithdrawnReward, uint256 usdcWithdrawnReward)
```

_Emitted upon successful reward withdrawal._

#### Parameters

| Name                | Type    | Description |
| ------------------- | ------- | ----------- |
| recipient `indexed` | address | undefined   |
| audtWithdrawnReward | uint256 | undefined   |
| usdcWithdrawnReward | uint256 | undefined   |

### Upgraded

```solidity
event Upgraded(address indexed implementation)
```

_Emitted when the implementation is upgraded._

#### Parameters

| Name                     | Type    | Description |
| ------------------------ | ------- | ----------- |
| implementation `indexed` | address | undefined   |

## Errors

### AddressEmptyCode

```solidity
error AddressEmptyCode(address target)
```

_There&#39;s no code at `target` (it is not a contract)._

#### Parameters

| Name   | Type    | Description |
| ------ | ------- | ----------- |
| target | address | undefined   |

### AlreadyVoted

```solidity
error AlreadyVoted()
```

_Already voted for the specified transfer._

### CannotRenounceOwnership

```solidity
error CannotRenounceOwnership()
```

_Contract must have an owner at all times._

### ERC1967InvalidImplementation

```solidity
error ERC1967InvalidImplementation(address implementation)
```

_The `implementation` of the proxy is invalid._

#### Parameters

| Name           | Type    | Description |
| -------------- | ------- | ----------- |
| implementation | address | undefined   |

### ERC1967NonPayable

```solidity
error ERC1967NonPayable()
```

_An upgrade function sees `msg.value &gt; 0` that may be lost._

### FailedCall

```solidity
error FailedCall()
```

_A call to an address target failed. The target may have reverted._

### InvalidInitialization

```solidity
error InvalidInitialization()
```

_The contract is already initialized._

### NoOwnedNodes

```solidity
error NoOwnedNodes()
```

_Reward cannot be added before any nodes are purchased._

### NoRewardAdded

```solidity
error NoRewardAdded()
```

_No reward added yet._

### NoRewardEarned

```solidity
error NoRewardEarned()
```

_No reward earned yet._

### NotInitializing

```solidity
error NotInitializing()
```

_The contract is not initializing._

### OwnableInvalidOwner

```solidity
error OwnableInvalidOwner(address owner)
```

_The owner is not a valid owner account. (eg. `address(0)`)_

#### Parameters

| Name  | Type    | Description |
| ----- | ------- | ----------- |
| owner | address | undefined   |

### OwnableUnauthorizedAccount

```solidity
error OwnableUnauthorizedAccount(address account)
```

_The caller account is not authorized to perform an operation._

#### Parameters

| Name    | Type    | Description |
| ------- | ------- | ----------- |
| account | address | undefined   |

### SafeERC20FailedOperation

```solidity
error SafeERC20FailedOperation(address token)
```

_An operation with an ERC-20 token failed._

#### Parameters

| Name  | Type    | Description |
| ----- | ------- | ----------- |
| token | address | undefined   |

### SameAddressRetraction

```solidity
error SameAddressRetraction()
```

_Vote had to be given to different addresses._

### SameAddressTransfer

```solidity
error SameAddressTransfer()
```

_Asset transfer has to be performed between different addresses._

### UUPSUnauthorizedCallContext

```solidity
error UUPSUnauthorizedCallContext()
```

_The call is from an unauthorized context._

### UUPSUnsupportedProxiableUUID

```solidity
error UUPSUnsupportedProxiableUUID(bytes32 slot)
```

_The storage `slot` is unsupported as a UUID._

#### Parameters

| Name | Type    | Description |
| ---- | ------- | ----------- |
| slot | bytes32 | undefined   |

### UnauthorizedAccount

```solidity
error UnauthorizedAccount()
```

_Account unauthorized to perform the action._

### ZeroAddress

```solidity
error ZeroAddress()
```

_Cannot invoke function with zero address._
