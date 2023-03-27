// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./Owner.sol";
import "@chainlink/contracts/src/v0.8/VRFV2WrapperConsumerBase.sol";

contract CoinFlip is VRFV2WrapperConsumerBase, Owner {

    event coinFlipRequest(uint256 requestId);
    event coinFlipResult(uint256 requestId, bool didWin);

    struct coinFlipStatus {
        uint fees;
        uint amountToPlay;
        uint randomWord;
        address player;
        bool didWin;
        bool fulfilled;
        coinFlipSelection choice;
    }

    enum coinFlipSelection {
        GREEN,
        RED 
    }

    mapping(uint => coinFlipStatus) public statuses;
    mapping(address => uint) public playerConsecutiveWins;

    address payable private contractAddress;

    uint128 constant entryFees = 0.001 ether;
    uint32 constant callbackGasLimit = 1_000_000;
    uint32 constant numWords = 1;
    uint16 constant requestConfirmations = 3;

    address constant linkAddress = 0x779877A7B0D9E8603169DdbD7836e478b4624789;
    address constant vrfWrapperAddress = 0xab18414CD93297B0d12ac29E63Ca20f515b3DB46;

    constructor() payable VRFV2WrapperConsumerBase(linkAddress, vrfWrapperAddress) {}      

    receive() external payable {}

    function getContractLiquidity() public view returns (uint){
        return address(this).balance;
    }

    function getContractAddress() public view returns (address){
        return address(this);
    }

    function getConsecutiveWins(address player) public view returns (uint){
        return playerConsecutiveWins[player];
    }

    function withdraw() external Owner.isOwner {
        payable(Owner.owner).transfer(address(this).balance);
    }

    function payPlayer(address payable _to, uint amountToPlay) public payable {
        uint amount = amountToPlay * 2;
        (bool sent, bytes memory data) = _to.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    function coinFlip(coinFlipSelection choice) external payable returns (uint256){
        require(msg.value >= entryFees, "Entry fees not sent");
        require(address(this).balance >= (msg.value * 2), "Insufficient balance! Try again later");

        uint256 requestId = requestRandomness(callbackGasLimit, requestConfirmations, numWords);
    
        statuses[requestId] = coinFlipStatus({
            fees: VRF_V2_WRAPPER.calculateRequestPrice(callbackGasLimit),
            amountToPlay: msg.value,
            randomWord: 0,
            player: msg.sender,
            didWin: false,
            fulfilled: false,
            choice: choice
        });

        emit coinFlipRequest(requestId);
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        require(statuses[requestId].fees > 0, "Request not found");

        statuses[requestId].fulfilled = true;
        statuses[requestId].randomWord = randomWords[0];

        coinFlipSelection result = coinFlipSelection.GREEN;
        if(randomWords[0] % 2 == 0){
            result = coinFlipSelection.RED;
        }

        if(statuses[requestId].choice == result){
            statuses[requestId].didWin = true;
            payPlayer(payable(statuses[requestId].player), statuses[requestId].amountToPlay);
            uint consecutiveWins = playerConsecutiveWins[statuses[requestId].player];
            playerConsecutiveWins[statuses[requestId].player] = consecutiveWins + 1;
        }else {
             playerConsecutiveWins[statuses[requestId].player] = 0;
        }

        emit coinFlipResult(requestId, statuses[requestId].didWin);
    }

    function getStatus(uint256 requestId) public view returns(coinFlipStatus memory){
        return statuses[requestId];
    }
}