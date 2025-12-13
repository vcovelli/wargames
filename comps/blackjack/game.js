export function createGame({ appendLine, appendCardLine, exitToTerminal }) {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  let deck = [];
  let player = [];
  let dealer = [];
  let roundOver = false;

  function buildDeck() {
    deck = [];
    suits.forEach((s) => {
      ranks.forEach((r) => deck.push({ r, s }));
    });
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawCard() {
    if (!deck.length) buildDeck();
    return deck.pop();
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    hand.forEach((c) => {
      if (c.r === "A") {
        aces++;
        total += 11;
      } else if (["K", "Q", "J"].includes(c.r)) {
        total += 10;
      } else {
        total += parseInt(c.r, 10);
      }
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function renderHands(showDealer = false) {
    appendCardLine("PLAYER:", player);
    appendLine(`PLAYER TOTAL: ${handValue(player)}`);
    appendCardLine("DEALER:", dealer, showDealer ? {} : { hideFromIndex: 1 });
    if (showDealer) appendLine(`DEALER TOTAL: ${handValue(dealer)}`);
    appendLine("");
  }

  function checkOutcome(showDealer = true) {
    const pv = handValue(player);
    const dv = handValue(dealer);
    if (pv > 21) {
      appendLine("PLAYER BUSTS. DEALER WINS.", "system");
      return true;
    }
    if (dv > 21) {
      appendLine("DEALER BUSTS. PLAYER WINS.", "system");
      return true;
    }
    if (showDealer) {
      if (pv > dv) appendLine("PLAYER WINS.", "system");
      else if (pv < dv) appendLine("DEALER WINS.", "system");
      else appendLine("PUSH.");
      return true;
    }
    return false;
  }

  function startRound() {
    roundOver = false;
    player = [drawCard(), drawCard()];
    dealer = [drawCard(), drawCard()];
    appendLine("BLACKJACK - NEW ROUND", "system");
    appendLine("TYPE HIT, STAND, OR EXIT TO LEAVE.");
    renderHands(false);
    if (handValue(player) === 21) {
      appendLine("BLACKJACK!");
      endRound();
    }
  }

  function endRound() {
    roundOver = true;
    while (handValue(dealer) < 17) {
      dealer.push(drawCard());
    }
    renderHands(true);
    checkOutcome(true);
    appendLine("TYPE DEAL TO PLAY AGAIN OR EXIT TO RETURN.", "system");
  }

  function start() {
    buildDeck();
    startRound();
  }

  function handleInput(raw) {
    const text = raw.trim().toUpperCase();
    if (text === "EXIT" || text === "/EXIT" || text === "QUIT") {
      appendLine("EXITING BLACKJACK. RETURNING TO TERMINAL.", "system");
      exitToTerminal();
      return;
    }
    if (text === "DEAL") {
      startRound();
      return;
    }
    if (roundOver) {
      appendLine("ROUND COMPLETE. TYPE DEAL OR EXIT.");
      return;
    }
    if (text === "HIT") {
      player.push(drawCard());
      renderHands(false);
      if (handValue(player) >= 21) {
        endRound();
      }
      return;
    }
    if (text === "STAND") {
      endRound();
      return;
    }
    appendLine("UNKNOWN COMMAND. USE HIT, STAND, DEAL, OR EXIT.");
  }

  return { start, handleInput };
}
