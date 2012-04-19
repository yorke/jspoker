var evaluator = function() {

	this.desc = function(handValue) {
  var elements = [];
  var description;

  var rankNames = [
    'deuce',
    'trey',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
    'ten',
    'jack',
    'queen',
    'king',
    'ace'
  ];

  function pluralRankName(rank) {
    if (rank == 4) {
      return 'sixes';
    }
    return rankNames[rank] + 's';
  }

  while (handValue > 0) {
    elements.unshift(handValue & 0xf);
    handValue >>= 4;
  }
  if (elements.length < 6) {
    elements.unshift(0);
  }

  switch (elements[0]) {
    case 0:
      description = 'High card: ' + rankNames[elements[1]] +
      ', followed by ' +
      rankNames[elements[2]] + ', ' +
      rankNames[elements[3]] + ', ' +
      rankNames[elements[4]] + ' and ' +
      rankNames[elements[5]];
      break;
    case 1:
      description = 'Pair of ' + pluralRankName(elements[1]) +
      ', followed by ' +
      rankNames[elements[3]] + ', ' +
      rankNames[elements[4]] + ' and ' +
      rankNames[elements[5]];
      break;
    case 2:
      description = 'Two pairs: ' + pluralRankName(elements[1]) +
       ' and ' + pluralRankName(elements[3]) +
      ', fifth card: ' + rankNames[elements[5]];
      break;
    case 3:
      description = 'Three ' + pluralRankName(elements[1]) +
      ', followed by ' +
      rankNames[elements[4]] + ' and ' +
      rankNames[elements[5]];
      break;
    case 4:
      description = 'Straight; top card: ' + rankNames[elements[1]];
      break;
    case 5:
      description = 'Flush; ' + rankNames[elements[1]] + ', ' +
      rankNames[elements[2]] + ', ' +
      rankNames[elements[3]] + ', ' +
      rankNames[elements[4]] + ', ' +
      rankNames[elements[5]];
      break;
    case 6:
      description = 'Full house: ' + pluralRankName(elements[1]) +
       ' full of ' + pluralRankName(elements[4]);
      break;
    case 7:
      description = 'Four ' + pluralRankName(elements[1]) +
      ', fifth card: ' + rankNames[elements[5]];
      break;
    case 8:
      description = 'Straight flush; top card: ' + rankNames[elements[1]];
      break;
    default:
      description = 'BUG!!! shouldn\'t happen';
  }

  return description;
}

    this.eval = function(card0, card1, card2, card3, card4, card5, card6) {

/*
  Input :

    Exactly 7 distinct numbers between 0 and 51 included.

    Each number represents a card. Its quotient by 4 represents its rank,
    from 0 (Deuce) to 12 - 0xc - (Ace). The remainder represents the suit.

  Output :

    undefined if the input is incorrect.

    Otherwise, a number describing the best poker hand that can be made
    with the 7 cards, such that higher numbers represent better hands.

    It has the following structure :

    - 4 leading bits representing the category of the best 5 card poker
      hand that can be made out of the 7 cards :
        0 (0x0) => high card,
        1 (0x1) => one pair,
        2 (0x2) => two pairs,
        3 (0x3) => three of a kind a.k.a. trip,
        4 (0x4) => straight,
        5 (0x5) => flush,
        6 (0x6) => full house,
        7 (0x7) => four of a kind a.k.a. quad,
        8 (0x8) => straight flush.
      ("Royal flush" is just a fancy name for a straight flush whose
      high card is an ace.)

     - 20 bits representing the ranks of the 5 most significant cards,
        4 bits per card, from 0 (0x0) => deuce to 12 (0xc) => ace.

     E.g, 0x27744a means 2 pairs (0x2), nines (0x77) and sixes (0x44),
     fifth card a queen (0xa). 0x6999cc means Full house, jacks full
     of aces.

*/

  var handValue; // the desired result

  function completeHandValue(cards) {
  /* A local function to add the top cards of a given array
  to a partially calculated handValue. */

    if (handValue < 0x10) { // put in a sentinel: when that bit
                            // reaches the 21st position, we're done
      handValue |= 0x10;
    }

    while (handValue < 0x200000 && cards.length > 0) {
      handValue <<= 4;
      handValue += cards.shift();
    }

    if (handValue & 0x1000000) { // done: remove the sentinel
      handValue &= 0xffffff;
    }
  } // end of local function completeHandValue

  if (arguments.length != 7) {
    return;
  }

  // Set up the three main data structures we shall use
  var suitCounts = [0, 0, 0, 0];
  var rankCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var isPresent = []; // isPresent[card] is true iff card is one
                      // of the 7 in the hand
  var card;
  var rank;
  var suit;

  for (var i = 0; i < 7; i++) {
    card = arguments[i];
    if (isPresent[card] || card < 0 || card > 51) {
      return;
    }

    isPresent[card] = true;

    rank = card >> 2;
    rankCounts[rank]++;

    suit = card & 3;
    suitCounts[suit]++;
  }

  // Determine if we have a flush, and if so, of what suit
  var flushSuit = -1;
  for (suit = 0; suit < 4; suit++) {
    if (suitCounts[suit] >= 5) {
      flushSuit = suit;
      break;
    }
  }

  if (flushSuit >= 0) { // there is a flush
    var run = []; // if this array ever reaches a length of 5,
                  // we have a Straight Flush!
    var ranksInFlushSuit = []; // this array collects the 5 highest
                               // ranks in the suit, in case we have not
    for (rank = 12; rank >= 0; rank--) {
      if (!isPresent[rank * 4 + flushSuit]) {
        continue;
      }
      if (rank === run[run.length - 1] - 1) {
        run.push(rank);
      } else if (run.length < 5) {
        run = [rank];
      }
      ranksInFlushSuit.push(rank);
    }

    // check for "wheel": straight 5432A
    if (run[3] === 0 && isPresent[48 + flushSuit]) {
      run.push(0xc); // push an ace
    }

    if (run.length >= 5) {
      handValue = 8; // straight flush
      completeHandValue(run);
    } else {
      handValue = 5; // flush
      completeHandValue(ranksInFlushSuit);
    }

    return handValue;
  }

  // there is no flush
  var pattern = [ // an array of 5 arrays
    [], // one for runs that could make straights, like above
    [], // one for high cards - it is pattern[1] by no coincidence
    [], // pattern[2] for pairs
    [], // pattern[3] for trips
    []  // pattern[4] for quads
  ];

  for (rank = 12; rank >= 0; rank--) {
    var rankCount = rankCounts[rank];

    if (!rankCount) {
      continue;
    }

    if (rank === pattern[0][pattern[0].length - 1] - 1) {
      pattern[0].push(rank);
    } else if (pattern[0].length < 5) {
      pattern[0] = [rank];
    }

    for (i = 1; i <= rankCount; i++) {
      pattern[rankCount].push(rank);
    }
  }

  // check for "wheel": straight 5432A
  if (pattern[0][3] === 0 && rankCounts[0xc]) {
    pattern[0].push(0xc); // push an ace
  }

  if (pattern[4].length) { // quad
    handValue = 7;
    // the fith card is tricky - it can be in trips, pairs or high cards
    var fifthCard = pattern[1][0]; // could be undefined
    if (fifthCard === undefined || fifthCard < pattern[2][0]) {
      fifthCard = pattern[2][0];
    }
    if (fifthCard === undefined || fifthCard < pattern[3][0]) {
      fifthCard = pattern[3][0];
    }
    pattern[4].push(fifthCard);
    completeHandValue(pattern[4]);
  } else if (pattern[3].length > 3 ||
      pattern[3].length && pattern[2].length) { // full house
    handValue = 6;
    completeHandValue(pattern[3]);
    completeHandValue(pattern[2]);
  } else if (pattern[0].length >= 5) { // straight
    handValue = 4;
    completeHandValue(pattern[0]);
  } else if (pattern[3].length) { // trip
    handValue = 3;
    completeHandValue(pattern[3]);
    completeHandValue(pattern[1]);
  } else if (pattern[2].length > 2) { // two pairs
    handValue = 2;
    if (pattern[2].length > 4 && pattern[2][4] < pattern[1][0]) {
      pattern[2].length = 4;
    }
    completeHandValue(pattern[2]);
    completeHandValue(pattern[1]);
  } else if (pattern[2].length) { // pair
    handValue = 1;
    completeHandValue(pattern[2]);
    completeHandValue(pattern[1]);
  } else { // high card
    handValue = 0;
    completeHandValue(pattern[1]);
  }

  return handValue;
} // end of function naiveHandEval

}

module.exports = new evaluator();