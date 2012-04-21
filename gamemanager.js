gameManager = function() {
	var self = this;
	var SB = 1;
	var pot = 0;
	var handNo = 0;
	var players = [];
	var playerStatus = {} //each player's status
	var bets = {}; //each player's bets for the current round
	var inPot = {}; //amount of money that is in the pot so far
	var commCards = [];
	var currentBet = 0; //the current highest bet
	var previousBet = 0; //the previous highest bet
	var currentStage = 0; //0 means preflop; 1 means flop; 2 means turn; 3 means river
	var currentPlayer = 0; //the current player whom the bet is on;
	var lastAggressor = 0;
	var currentAction = null;
	deck = require("./card.js");
	evaluator = require("./handeval.js");
	var dealerPos = 0;
	
	var player = function(name, chips) {
		var self = this;
		this.chips = chips;
		this.name = name;
		this.seated = true;
		this.inhand = true;
		this.allin = false;
		this.hand = [];
		
		this.reportHand = function() {
			return (this.name + " currently holds " + self.hand.join(",") + ".");
		}
		
		this.resetHand = function () {
			self.hand = [];
		}
		
		this.addCard = function(card) {
			self.hand.push(card);
		}
		
		//Buy chips from the bank
		this.buyChips = function(n) {
			self.chips += n;
		};
		
		//match the amount of the bet
		this.matchChips = function(amt) {
			if (bets[self.name] == null) {
				bets[self.name] = 0;
			}
			amt -= bets[self.name];
			self.putChips(amt);
		}
		
		//put chips into the pot
		this.putChips = function(amt) {
			if (amt >= self.chips) {
				amt = self.chips;
			}
			
			if (inPot[self.name] == null) {
				inPot[self.name] = 0;
			}
			if (bets[self.name] == null) {
				bets[self.name] = 0;
			}		
				
			self.chips -= amt;
			inPot[self.name] += amt;
			bets[self.name] += amt;
			log(" puts " + amt + " chips into the pot.", false, self);
			return amt;
		}

		//win the amount of chips from the pot		
		this.winChips = function(amt) {
			self.chips += amt;
			log("wins " + amt + " chips from the pot.", false, self);		
		}
	}
	
	this.log = function(tolog, serveronly, player) {
		var output = "";
		if (player != null) {
			if (isNaN(player)) {
				player = self.findPlayer(player);
			}
			
			if (player >= players.length) {
				console.log("Invalid player number: " + player);
				return;
			}
			output += players[player].name + "(Player " + player + ") ";
		}
		
		output += tolog;
		console.log(output);
		if (!serveronly) {
			//push notification to all clients
		}
		
	}
	
	this.findPlayer= function(player) {
		for (var i = 0; i < players.length; i++) {
			if (players[i] === player) {
				return i;
			}
		}
		return 999;
	}
	
	var log = this.log;
	this.addNewPlayer = function (name, chips) {
		var np = new player(name, chips);
		players.push(np);
		console.log("Added player : " + name + " to game(" + chips + " chips).");
		return np;
	}
	
	this.playerCount = function() {
		return players.length;
	}
	
	this.seatedPlayerCount = function() {
		count = 0;
		for (var i = 0; i < players.length; i ++) {
			if (players[i].seated) {
				count++;
			}
		}
		return count;
	}
	
	this.inHandPlayerCount = function() {
		count = 0;
		for (var i = 0; i < players.length; i ++) {
			if (players[i].seated && players[i].inhand) {
				count++;
			}
		}
		return count;
	}
	
	this.getNextPlayerInHand = function(n) {
		//n is index of current player;
		n = (n + 1) % self.playerCount();

		if (!players[n].seated || !players[n].inhand) {
			return self.getNextPlayerInHand(n);
		} else {
			return n;
		}
	}
	
	this.getNextPlayer = function(n) {
		//n is index of current player;
		n = (n + 1) % self.playerCount();
		if (!players[n].seated) {
			return self.getNextPlayer(n);
		} else
		return n;
	}
	
	this.getNextNPlayersInHand = function(n, k) {
		for(var i = 0; i < k; i ++) {
			n = self.getNextPlayerInHand(n);
		}
		
		return n;
	}

	this.getPreviousNPlayersInHand = function(n, k) {
		for(var i = 0; i < k; i ++) {
			n = self.getPreviousPlayerInHand(n);
		}
		return n;
		
	}
	
	this.getPreviousPlayerInHand = function(n) {
		n = (n - 1 + self.playerCount() ) % self.playerCount();
		if (!players[n].seated || !players[n].inhand) {
			return self.getPreviousPlayerInHand(n);
		} else
		return n;
	}
	
	this.firstToAct = function() {
		//start from sb
		n = self.getNextNPlayersInHand(dealerPos, 1);
		//find the first seated and active player
		
		while (!players[n].seated || !players[n].inhand) {
			n = (n + 1) % self.playerCount();
		}
		return n;
	}
		
	this.assignBlinds = function(dealer) {
		if (self.seatedPlayerCount() <= 1) {
			console.log("Can't play game with less than 2 players");
			return false;
		}
		var p = self.getNextPlayer(dealer);
		console.log("Player " + p + " puts small blind.");
		players[p].putChips(SB);
		p = self.getNextPlayer(p);
		console.log("Player " + p + " puts big blind.");
		players[p].putChips(SB*2);
		currentBet = SB * 2;
		return true;
	}
	
	this.dealToPlayers = function (n) {
		//n is the number of cards for each player
		if (n == null) {
			n = 2;
		}
		
		for (var p = 0; p < self.playerCount(); p++) {
			players[p].resetHand();
		}
		
		
		var card;
		for (var i = 0; i < n; i ++) {
			//go two rounds, dealing one card to each seated player
			
			for (var p = 0; p < self.playerCount(); p++) {
				if (players[p].seated) {
					card = deck.dealNext();
					players[p].addCard(card);
				}
				
			}			
		}
		
		for (var p = 0; p < self.playerCount(); p++) {
			console.log(players[p].reportHand());
		}

		
	}
	
	this.dealNextHand = function() {
		if (self.seatedPlayerCount() <= 1) {
			console.log("Can't play game with less than 2 players");
			return false;
		}
		handNo ++;
		currentStage = 0;
		console.log("Shuffling new deck");
		deck.shuffleNewDeck();
		console.log("Dealing the next hand - " + handNo);
		//reset the pot
		console.log("Resetting pot");
		pot = 0;
		//resets all bets
		bets = {};
		inPot = {}; 
		//reset community cards
		commCards = [];
		//move the dealer button
		dealerPos++;
		dealerPos %= self.playerCount();
		console.log("Dealer button now on player: " + dealerPos + "(" + players[dealerPos].name + ")");
		
		for (var p = 0; p < self.playerCount(); p++) {
			players[p].inhand = true;
		}
		
		//assign blinds
		self.assignBlinds(dealerPos);
		console.log(dealerPos);
		lastAggressor = self.getNextNPlayersInHand(dealerPos, 3);
		console.log(lastAggressor);
		//deal cards to players
		var c = 2;
		console.log("Dealing " + c + " cards to each player..");
		self.dealToPlayers(c);
		
		//utg;
		currentPlayer = self.getNextPlayer(self.getNextPlayer(self.getNextPlayer(dealerPos)));
		self.promptPendingAction();
	}
	
	
	self.getPendingAction = function(cb, pb, player) {
		//cb - current bet
		//pb - previous bet
		//player - current player
		
		var action = function(name, amount) {
			this.name = name;
			this.amount = amount;
			if (this.amount.length == 2) {
				//this.amount is an array
				if (this.amount[1] < this.amount[0]) {
					//if the player doesnt have enough chips to make the bet/call, prevent him from being able to commit more than he can
					this.amount[0] = this.amount[1];
				}
			}

		}
		
		var al = [];
		//a player can always fold
		al.push(new action("fold", 0));
		if (cb == 0) {
			//a player can check if no action is on him
			al.push(new action("check", 0));
			//a player can bet 1BB to all his chips
			al.push(new action("bet", [2 * SB, player.chips]));
		} else {
			//a player can call a current bet
			var inpot = bets[player.name];
			if (inpot == null) inpot = 0;
			var tocall = cb - inpot;
			if (tocall > 0) {
				al.push(new action("call", Math.min(tocall, player.chips)));
			}  else {
				al.push(new action("check", 0));
			}
			//a player can raise to at least as much as the previous raise
			al.push(new action("raise", [2 * cb - pb, player.chips]));
		}
		return al;
	}
	
	this.promptPendingAction = function() {
		console.log("Possible actions for " + players[currentPlayer].name);
		currentAction = self.getPendingAction(currentBet, previousBet, players[currentPlayer]);
		var inpot = bets[players[currentPlayer].name];
		if (inpot == null) inpot = 0;
		console.log("The current bet is " + currentBet + ". You have " + inpot + " chips in the pot this round. Your possible actions are: ");
		console.log(currentAction);

	}
	
	//This function actually performs the action
	this.performActionHelper = function(name, amount) {
		var player = players[currentPlayer];
		var pn = player.name;
		if (name === 'fold') {
			self.log("folds.", false, currentPlayer);
			player.inhand = false;
			//discard player's hand
		} else if (name === 'check') {
			self.log("checks.", false, currentPlayer);	
		} else if (name === 'call') {
			self.log("calls " + amount + ".", false, currentPlayer);
			player.matchChips(currentBet);
		} else if (name === 'raise') {
			self.log("raises to " + amount + ".", false, currentPlayer);
			currentBet = amount;
			player.matchChips(currentBet);
			lastAggressor = currentPlayer;
			//other players must now respond to to the raise
		} else if (name === 'bet') {
			self.log("bets " + amount + ".", false, currentPlayer);
			currentBet = amount;
			player.matchChips(currentBet);
			lastAggressor = currentPlayer;
		}
		
		self.advanceAction();
	}
	
	//Decides whether to move on to the next player, or deal a new community card, or 
	this.advanceAction = function() {
		//we can only deal the next community card when all the players in the hand have matched the current bet

		currentPlayer = self.getNextPlayerInHand(currentPlayer);
		//console.log("Current player" + currentPlayer);
		if (self.inHandPlayerCount() <= 1) {
			self.log("wins the pot. All other players fold.", false, currentPlayer);
			//award pot to currentPlayer
			//TODO: Check for allin players here!
			//deal next hand
			self.dealNextHand();
			return;
		}
		
		//if (currentBet
		if (currentPlayer == lastAggressor) {
			self.log("Dealing next community card", false);
			currentStage++;
			if (currentStage == 4) {
				self.performShowdown();
				return;
			}
			
			self.dealNextStep();
			//set lastaggressor to SB
			lastAggressor = self.firstToAct();
			currentPlayer = self.firstToAct()
			
			bets = {};
			currentBet = 0;
		}
		
		self.log(", it is your turn.", false, currentPlayer);
		self.promptPendingAction();
	}
	
	function playerSort(p1, p2) {
		if (inPot[p1.name] == null) {
			inPot[p1.name] = 0;
		}
		
		if (inPot[p2.name] == null) {
			inPot[p2.name] = 0;
		}
		
		
		return inPot[p1.name] - inPot[p2.name];
	}
	
	
	
	this.performShowdown = function() {
		//each player shows their cards in turn
		var first = self.firstToAct();
		var p = first;
		
		var pchips = [];
		var pvalues = {};
		do {
			//check everyone's hand
			var hand = players[p].hand.slice(0).concat(commCards);
			var desc = deck.descHand(hand);
			self.log("shows " + players[p].hand + ", " + desc.desc, false, p);
			pvalues[players[p].name] = desc.value;
			//pvalues[players[p].name] = 10;
			if (inPot[players[p].name] > 0) {
				pchips.push(players[p]);
			}
			p = self.getNextPlayerInHand(p);
			//console.log(desc.value);
		} while (p != first);
		pchips.sort(playerSort);
		//see who has the most chips
		//see who has the second highest chips
		//at this point in time the player at pchips[0] takes all the chips
		var potcount = 0; 
		while (pchips.length > 0) {
			//first pot to be awarded is the main pot. All others are the sub pots.
			var poteach = inPot[pchips[0].name];
			var newresult = [];
			for (var i = 0; i < pchips.length; i++) {
				inPot[pchips[i].name] -= poteach;
				if (inPot[pchips[i].name] > 0) {
					newresult.push(pchips[i]);
				}
			}
			self.awardPot(pchips, poteach * pchips.length, pvalues, potcount);
			potcount++;
			pchips = newresult;
			
		}
		
	}
	
	this.awardPot = function(pset, amt, pvalues, potcount) {
		var pottype = (potcount == 0) ? "Main": "Side";
		if (amt == 0) return;
		var maxstr = 0;
		var maxset = [];
		for (var i = 0; i < pset.length; i++) {
			var player = pset[i];
			if (pvalues[player.name] > maxstr) {
				maxset = [player];
				maxstr = pvalues[player.name];
			} else if (pvalues[player.name] == maxstr) {
				maxset.push(player);
			}
		}
		if (maxset.length > 1) {
			amt /= maxset.length;
			var output = "";
			for (var i = 0; i < maxset.length; i++) {
				maxset[i].winChips(amt);
			}
			self.log(pottype + " pot of " + amt + " chips each awarded to players: " + 
				_.map(
					maxset,
					function(element) {
						return element.name
					}).join(","));
						
			 
			
		} else if (maxset.length == 1) {
			self.log(pottype + " pot of " + amt + " chips awarded to " + maxset[0].name);
			maxset[0].winChips(amt);
		}
		
	}
	
	
	
	this.performAction = function(actionlist, selection, amount) {
		//given an action, perform the selected one for the selected amount (amount may be null/default to 0)
		selection = parseInt(selection);
		if (isNaN(selection)) {
			self.log("Invalid selection. Please try again");
			return false;
		}
		var action = actionlist[selection];
		var chosenamount = 0;
		var player = players[currentPlayer];
		self.log("Performing action: " + action.name);
		if (action.amount.length == 2) {
			if (!(amount>= action.amount[0] && amount <= action.amount[1])) {
				self.log("Invalid amount selected. Please try again");
				return false;
			} else {
				chosenamount = amount;
			}
		} else {
			chosenamount = action.amount;
		}
		
		if (chosenamount > player.chips) {
			self.log("Player does not have so many chips. Please try again.");
			return false;
		}
		
		self.log("For amount: " + chosenamount);
		self.performActionHelper(action.name, chosenamount);
	}
	
	var inputsofar = [];
	
	
	this.performActionTextWrapper = function (input) {
	var action = currentAction;
		if (inputsofar.length == 0) {
			input = parseInt(input);
			if (action[input].name === "fold" || action[input].name === "call" || action[input].name === "check") {
				return self.performAction(action, input, null);
			} else {
				inputsofar.push(input);
				self.log("Selected choice: " + input + ". Enter amount:", false);
			}
		} else {
			self.performAction(action, inputsofar[0], input);
			inputsofar = [];
		}
		
	}
	
	
	this.dealCommCards = function(n) {
		var card;
		for (var i = 0; i < n; i ++) {
			card = deck.dealNext();
			commCards.push(card);
		}

		console.log(self.reportCommCards());
	}
	
	this.reportCommCards = function() {
		return "Community cards are: " + commCards.join(",");
	}
	
	this.dealNextStep = function() {
		//currentStage++;
		//currentStage %= 4;
		console.log("current stage" + currentStage);
		switch (currentStage) {
			case 0:
				self.dealNextHand();
				break;
			case 1:
				self.dealCommCards(3);
				break;
			case 2:
				self.dealCommCards(1);
				break;
			case 3:
				self.dealCommCards(1);
				break;
			default:
				//end of hand;
				//shown and reward pot, then deal next hand
				
				break;
		}
	}	
}



module.exports = new gameManager();