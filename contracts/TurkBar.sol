// SPDX-License-Identifier: MIT

pragma solidity 0.6.12;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// TurkBar is the coolest bar in town. You come in with some Turk, and leave with more! The longer you stay, the more Turk you get.
//
// This contract handles swapping to and from xTurk, TurkSwap's staking token.
contract TurkBar is ERC20("TurkBar", "xSUSHI"){
    using SafeMath for uint256;
    IERC20 public turk;

    // Define the Turk token contract
    constructor(IERC20 _turk) public {
        turk = _turk;
    }

    // Enter the bar. Pay some SUSHIs. Earn some shares.
    // Locks Turk and mints xTurk
    function enter(uint256 _amount) public {
        // Gets the amount of Turk locked in the contract
        uint256 totalTurk = turk.balanceOf(address(this));
        // Gets the amount of xTurk in existence
        uint256 totalShares = totalSupply();
        // If no xTurk exists, mint it 1:1 to the amount put in
        if (totalShares == 0 || totalTurk == 0) {
            _mint(msg.sender, _amount);
        } 
        // Calculate and mint the amount of xTurk the Turk is worth. The ratio will change overtime, as xTurk is burned/minted and Turk deposited + gained from fees / withdrawn.
        else {
            uint256 what = _amount.mul(totalShares).div(totalTurk);
            _mint(msg.sender, what);
        }
        // Lock the Turk in the contract
        turk.transferFrom(msg.sender, address(this), _amount);
    }

    // Leave the bar. Claim back your SUSHIs.
    // Unlocks the staked + gained Turk and burns xTurk
    function leave(uint256 _share) public {
        // Gets the amount of xTurk in existence
        uint256 totalShares = totalSupply();
        // Calculates the amount of Turk the xTurk is worth
        uint256 what = _share.mul(turk.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        turk.transfer(msg.sender, what);
    }
}
