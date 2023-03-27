var red = 0;
var green = 0;
var coin;
var flipBtn;
var contract;
var userAccount = web3.currentProvider.selectedAddress;
var choice;
var requestId;
var timer;
var statsUpdateHelper = 0;

function login() {
  const accounts = window.ethereum.request({
    method: "eth_requestAccounts",
  });
}

function getAccount() {
  if (web3.currentProvider.selectedAddress !== userAccount) {
    userAccount = web3.currentProvider.selectedAddress;

    if (userAccount == null) {
      $("#login").prop("disabled", false);
      $("#login").text("Connect Wallet");
    } else {
      $("#login").prop("disabled", true);
      $("#login").text("Wallet Connected");
    }
  }
}

async function getContractLiquidity() {
  var contractLiquidity = await contract.methods.getContractLiquidity().call();
  $(".contractLiquidity").html(
    "Contract Balance: " +
      web3js.utils.fromWei(contractLiquidity, "ether") +
      " Ether"
  );
}

async function getConsecutiveWins() {
  var consecutiveWins = await contract.methods
    .getConsecutiveWins(userAccount)
    .call();
  $(".consecutiveWins").html("Consecutive Wins: " + consecutiveWins);
}

function getChoice(e) {
  if (e.delegateTarget.id == "greenCoin") {
    choice = 0;
    $(".button-green").css("border-color", "black").css("border-width", "2px");
    $(".button-red").css("border-color", "#FF4742").css("border-width", "1px");
  } else {
    choice = 1;
    $(".button-red").css("border-color", "black").css("border-width", "2px");
    $(".button-green")
      .css("border-color", "#149131")
      .css("border-width", "1px");
  }
}

function notify(didWin) {
  var notify;
  if (timer != 1) {
    new Notify({
      title: (notify = didWin == 1 ? "Win!" : "Loss!"),
      text: (notify =
        didWin == 1
          ? "The amount has been deposited into your account!"
          : "The amount has been withdrawn from your account!"),
      autoclose: true,
      autotimeout: 5000,
      status: (notify = didWin == 1 ? "success" : "error"),
      position: "right top",
      type: 1,
    });

    timer = 1;

    setTimeout(function () {
      timer = 0;
    }, 2500);
  }
}

function updateStats(didWin) {
  if (statsUpdateHelper == 0) {
    if (didWin == 1) {
      if (choice == 0) green++;
      else red++;
    } else {
      if (choice == 0) red++;
      else green++;
    }
    $("#green-count").html(green);
    $("#red-count").html(red);
    statsUpdateHelper = 1;
  }
}

function flipCoin() {
  var entryFee = $("#entryFee").val();

  return contract.methods
    .coinFlip(choice)
    .send({ from: userAccount, value: web3js.utils.toWei(entryFee, "ether") })
    .on("receipt", async function (receipt) {
      statsUpdateHelper = 0;
      $("#flip-button").prop("disabled", true);
      coin.style.animation = "none";
      coin.style.animation = "spin 5s linear infinite";

      requestId = receipt.events.coinFlipRequest.returnValues.requestId;

      contract.events
        .coinFlipResult()
        .on("data", function (event) {
          var choiceName = choice == 0 ? "green" : "red";
          if (event.returnValues.didWin) {
            coin.style.animation = "none";
            coin.style.animation = "spin-" + choiceName + " 3s forwards";
          } else {
            choiceName = choiceName == "green" ? "red" : "green";
            coin.style.animation = "none";
            coin.style.animation = "spin-" + choiceName + " 3s forwards";
          }

          $("#flip-button").prop("disabled", false);
          updateStats(event.returnValues.didWin);
          notify(event.returnValues.didWin);
        })
        .on("error", console.error);
    })
    .on("error", function (error) {
      alert(error.message);
    });
}

/***************************/
function init(e) {
  if (typeof web3 !== "undefined") {
    // Use Mist/MetaMask's provider
    web3js = new Web3(web3.currentProvider);

    var contractAddress = "0xE81376a05E05B84400aE7ECF080E16554af90b6A";
    contract = new web3js.eth.Contract(coinFlipABI, contractAddress);

    getAccount();
    var accountInterval = setInterval(getAccount, 100);

    getContractLiquidity();
    var contractLiquidityInterval = setInterval(getContractLiquidity, 60000);

    getConsecutiveWins();
    var consecutiveWinsInterval = setInterval(getConsecutiveWins, 1000);
  } else {
    alert("Metamask is not installed");
  }
}

window.onload = function (e) {
  init(e);

  $(".choice").click(getChoice);
  $("#flip-button").click(flipCoin);
  $("#login").click(login);

  coin = document.getElementById("coin");
  flipBtn = document.getElementById("flip-button");
};
