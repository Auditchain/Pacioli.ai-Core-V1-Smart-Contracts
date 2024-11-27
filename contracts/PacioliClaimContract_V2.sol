// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {PacioliClaimContract} from "./PacioliClaimContract.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract PacioliClaimContract_V2 is PacioliClaimContract {
    /**
     * @dev Returns how many nodes `_address` owns.
     * @return Number of nodes owned by `_address`.
     */
    function getOwnedNodesForAddress(
        address _address
    ) external view virtual onlyAdmins returns (uint256) {
        return s_recipients[_address].ownedNodes;
    }
}
