HydroVoting = (function($) {
  return {
    stateChange: function (alert, text, state) {
      var classes
      switch (state) {
        case "proven":
          classes = "alert-success"
          break
        case "info":
          classes = "alert-info"
          break
        case "error":
          classes = "alert-danger noselect"
          break
        case "default":
          classes = "alert-dark noselect"
          break
        case "warning":
          classes = "alert-warning noselect"
          break
      }

      alert
        .removeClass("alert-info alert-dark alert-danger alert-success alert-warning noselect")
        .addClass(classes)
        .html(text)
    },

    launchErrorModal: function (title, message) {
      var modal = $("#errorModal")
      modal.find(".modal-title").html(title)
      modal.find(".modal-body").html(message)
      modal.modal("show")
    },

    castVote: function (event) {
      // variable identification
      var form = $("#vote")
      var secret = form.find(".form-group:eq(0)").find(".form-control:eq(0)").val()
      var candidate = form.find(".form-group:eq(1)").find(".form-control:eq(0)").val()

      // state update
      HydroVoting.stateChange(form.find("[role='alert']"), "Loading...", "default")

      // call smart contract
      HydroVoting.Vote.methods.castVote(secret, candidate).send({ from: HydroVoting.defaultAccount, value: 0 })
        .on('transactionHash', transactionHash => {
          var transactionLink =
            `<a target="_blank" href="https://etherscan.io/tx/${transactionHash}" class="nounderline">` +
            'View your vote on-chain!</a>'
          HydroVoting.stateChange(form.find("[role='alert']"), transactionLink, "info")
        })
        .on('error', () => {
          HydroVoting.stateChange(form.find("[role='alert']"), "Error, please try again.", "error")
        })
    },

    initializeWeb3: function() {
      // check if metamask acct needs to be unlocked
      // if (typeof ProveIt.web3Status.account == "undefined") {
      //     ProveIt.stateChange(form.find("[role='alert']"), "Please unlock your MetaMask account.", "warning")
      // }
      //window.web3 = new Web3(web3.currentProvider)
      if (typeof web3 === 'undefined') {
        HydroVoting.launchErrorModal(
          "Wallet Integration Required",
          "This DApp requires the ability to send a transaction to the Ethereum blockchain. " +
            "Please visit with the Trust Wallet App.<br/><br/>" +
            "<a role='button' href='https://links.trustwalletapp.com/7YAUKYkGRM' class='w-100 h-100 btn btn-primary nofocus cursor-pointer'>Open with Trust</button>"
          )
      } else {
        web3 = new Web3(web3.currentProvider);
      }
      HydroVoting.web3CheckOnce()
    },

    web3CheckOnce: function () {
      if (!web3.currentProvider.isTrust) {
        HydroVoting.launchErrorModal(
          "Provider Warning",
          "We recommmend that you use this DApp with the Trust Wallet App.<br/><br/>" +
            "<a role='button' href='https://links.trustwalletapp.com/7YAUKYkGRM' class='w-100 h-100 btn btn-primary nofocus cursor-pointer'>Open with Trust</button>"
        )
      }

      web3.eth.net.getId()
        .then(id => {
          if (id == "1") {
            // now that we know web3 is initialized and on a proper network...
            HydroVoting.initializeContracts()
            HydroVoting.web3CheckMany()
          } else {
            HydroVoting.launchErrorModal(
              "Network Error",
              `You're currently on a test network. Please switch to the Ethereum mainnet.`
            )
            web3 = undefined
          }
        })
        .catch(error => {
          HydroVoting.launchErrorModal(
            "Network Error",
            "Could not detect Ethereum network, please ensure that your browser is functioning correctly."
          )
          web3 = undefined
        })
    },

    initializeContracts: function () {
      var contracts = {
        Vote: {
          abi: [{"constant":true,"inputs":[],"name":"totalVotes","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"candidateDirectory","outputs":[{"name":"candidateId","type":"uint256"},{"name":"candidateName","type":"string"},{"name":"candidateDescription","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"voteCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"voteName","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"nextCandidateId","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_salt","type":"uint256"},{"name":"_voteName","type":"string"},{"name":"approvedHashes","type":"bytes32[]"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"name":"candidateId","type":"uint256"},{"indexed":false,"name":"candidateName","type":"string"},{"indexed":false,"name":"candidateDescription","type":"string"}],"name":"CandidateRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"candidateId","type":"uint256"}],"name":"VoteCast","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"constant":false,"inputs":[{"name":"candidateName","type":"string"},{"name":"candidateDescription","type":"string"}],"name":"registerCandidate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"candidateId","type":"uint256"}],"name":"candidateInformation","outputs":[{"name":"name","type":"string"},{"name":"description","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"secret","type":"uint256"},{"name":"candidateId","type":"uint256"}],"name":"castVote","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"}],
          address: "0x0B8E87d9Da26Db6679DFe27011b70E274Ba12493"
        }
      }
      Object.keys(contracts).map(key => {
        HydroVoting[key] = new web3.eth.Contract(contracts[key].abi, contracts[key].address)
      })
    },

    web3CheckMany: function () {
      // set default account
      web3.eth.getAccounts()
        .then(accounts => {
          HydroVoting.defaultAccount = accounts[0]
        })
      // schedule repeat
      setTimeout(HydroVoting.web3CheckMany, 1000)
    },

    windowReadyWrapper: function () {
      if (HydroVoting.windowReady && HydroVoting.DOMReady) {
        HydroVoting.initializeWeb3()
      }
    }
  }
})(jQuery)

// DOM-dependent code
$(function() {
  HydroVoting.DOMReady = true
  // add event listeners to relevant buttons
  $("#voteButton").on("click", HydroVoting.castVote)
  // make sure web3 gets initialized
  HydroVoting.windowReadyWrapper()
})

// window-dependent code
$(window).on("load", function () {
  HydroVoting.windowReady = true
  // make sure web3 gets initialized
  HydroVoting.windowReadyWrapper()
})
