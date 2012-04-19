var deck = function() {
	var self = this;
	var suits = ["clubs", "diamonds", "hearts", "spades"];
	var suits_abbrev = ["c", "d", "h", "s"]; //used only for abbreviation
	var rank_abbrev = ['', 'A', '2' ,'3','4','5','6','7','8','9','T','J','Q','K'];
	var currentDeck = [];
	
	//calculate  the score
	this.handToString = function(set) {
		result = [];
		for (var i = 0; i < Math.min(7, set.length); i++) {
//		for (var i = 0; i < 52; i++) {
			var card = set[i];
			var rank = card.rank;
			rank = (rank - 2 + 13) % 13;
			var total = (rank * 4) + card.suit;  
			result.push(total);
		}
		return result;
	}
	
	/*this.test = function() {
		currentDeck = [];
		self.newDeck();
		console.log(currentDeck);
		console.log(self.handToScore(currentDeck));
	}*/
	
	this.card = function(suit, rank) {
		var self = this;
		this.suit = suit;
		this.rank = rank;
		if (rank == null) {
			//work with the first suit only
			this.suit = Math.floor(suit/13);
			this.rank = suit%13 + 1;
		}
		if (this.suit < 0 || this.suit > 3 || this.rank < 1 || this.rank > 13) {
			return null;
		}
		
		this.toDOM = function(id) {
			var dom = $("<div></div>");
			dom.addClass("card").addClass("rank" + (self.rank)).addClass(suits[self.suit]);
			return dom;
		}
		
		this.toString = function() {
			return (rank_abbrev[self.rank] + suits_abbrev[self.suit]);
		}
	}
	
	this.newCard = function(suit, rank) {
		return new this.card(suit, rank);
	}
	
	this.newDeck = function() {
		for (var i = 0; i < 52; i++) {
			currentDeck.push(self.newCard(i));	
		}
	}
	
	function swap(i, j) {
		var temp = currentDeck[i];
		currentDeck[i] = currentDeck[j];
		currentDeck[j] = temp;
	}
	
	this.shuffleDeck = function() {
		var j;
		for (var i = 51; i >= 0; i--) {
			j = Math.floor(Math.random() * 52);
			swap(i, j);
		}
	}
		
	this.shuffleNewDeck = function() {
		currentDeck = [];
		self.newDeck();
		self.shuffleDeck();
	}
	
	this.dealNext = function() {
		if (currentDeck.length <= 0) {
			return null;
	}
		var card = currentDeck.shift();
		return card;
	}
	
	self.shuffleNewDeck();
}

module.exports = new deck();