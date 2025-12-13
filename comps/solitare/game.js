export function createGame({
  appendLine,
  formatCardChunks,
  cardSuitClass,
  exitToTerminal,
}) {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const foundationAliases = {
    FHEART: "♥",
    FHEARTS: "♥",
    HEART: "♥",
    HEARTS: "♥",
    FH: "♥",
    FDIAMOND: "♦",
    FDIAMONDS: "♦",
    DIAMOND: "♦",
    DIAMONDS: "♦",
    FD: "♦",
    FSPADE: "♠",
    FSPADES: "♠",
    SPADE: "♠",
    SPADES: "♠",
    FS: "♠",
    FCLUB: "♣",
    FCLUBS: "♣",
    CLUB: "♣",
    CLUBS: "♣",
    FC: "♣",
  };
  let stock = [];
  let waste = [];
  let tableaus = [];
  let foundations = { "♠": [], "♥": [], "♦": [], "♣": [] };
  let autoCompleting = false;
  let autoTimer = null;

  function buildDeck() {
    const deck = [];
    suits.forEach((s) => ranks.forEach((r) => deck.push({ r, s, up: false })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function showHelp() {
    appendLine("SOLITAIRE COMMAND REFERENCE", "system");
    appendLine("  DRAW                  - FLIP NEXT STOCK CARD", "system");
    appendLine("  MOVE WASTE T#         - PLACE WASTE CARD ON TABLEAU", "system");
    appendLine("  MOVE WASTE FHEART     - MOVE WASTE CARD TO FOUNDATION", "system");
    appendLine("  MOVE T# T# [COUNT]    - MOVE STACK BETWEEN TABLEAUS", "system");
    appendLine("  MOVE T# FHEART ETC.   - MOVE TOP TABLEAU CARD TO FOUNDATION", "system");
    appendLine("  FLIP T#               - TURN TOP FACE-DOWN CARD UP", "system");
    appendLine("  RESET                 - REDEAL", "system");
    appendLine("  HELP                  - SHOW THIS GUIDE AGAIN", "system");
    appendLine(
      "AUTO-COMPLETE ENGAGES WHEN STOCK IS EMPTY & ALL TABLEAU CARDS FACE UP.",
      "system"
    );
  }

  function stopAutoComplete() {
    autoCompleting = false;
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
  }

  function reset() {
    stopAutoComplete();
    stock = buildDeck();
    waste = [];
    foundations = { "♠": [], "♥": [], "♦": [], "♣": [] };
    tableaus = Array.from({ length: 7 }, () => []);
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j <= i; j++) {
        const card = stock.pop();
        card.up = j === i;
        tableaus[i].push(card);
      }
    }
    appendLine("SOLITAIRE: BUILD FOUNDATIONS BY SUIT FROM A TO K.", "system");
    appendLine(
      "TYPE HELP FOR A COMMAND REFERENCE. USE FHEART/FSPADE/FCLUB/FDIAMOND FOR FOUNDATIONS.",
      "system"
    );
    appendLine(
      "ONCE ALL CARDS ARE FACE UP AND STOCK IS EMPTY, AUTO-COMPLETE WILL DEPLOY.",
      "system"
    );
    appendLine("EXIT TO LEAVE, RESET TO REDEAL.", "system");
    render();
  }

  function cardColor(card) {
    return card.s === "♥" || card.s === "♦" ? "red" : "black";
  }

  function rankIndex(r) {
    return ranks.indexOf(r);
  }

  function render() {
    appendLine("");
    const wasteChunks = waste.length
      ? formatCardChunks([waste[waste.length - 1]])
      : ["EMPTY"];
    appendLine([
      { text: `STOCK: ${stock.length} | WASTE: `, className: "chat-meta" },
      ...wasteChunks,
    ]);
    const foundationChunks = [];
    suits.forEach((s, idx) => {
      if (idx) foundationChunks.push("  ");
      foundationChunks.push({ text: `${s}:`, className: "chat-meta" }, " ");
      if (foundations[s].length) {
        foundationChunks.push({
          text: `${foundations[s][foundations[s].length - 1].r}${s}`,
          className: `card-span ${cardSuitClass(s)}`,
        });
      } else {
        foundationChunks.push("-");
      }
    });
    appendLine(["FOUNDATIONS: ", ...foundationChunks]);
    appendLine("TABLEAU:");
    tableaus.forEach((pile, idx) => {
      const chunks = [{ text: `  T${idx + 1}: `, className: "chat-meta" }];
      if (!pile.length) {
        chunks.push("EMPTY");
      } else {
        pile.forEach((card, i) => {
          if (i > 0) chunks.push(" ");
          if (card.up) {
            chunks.push({
              text: `${card.r}${card.s}`,
              className: `card-span ${cardSuitClass(card.s)}`,
            });
          } else {
            chunks.push({ text: "##", className: "card-span hidden" });
          }
        });
      }
      appendLine(chunks);
    });
    appendLine("");
  }

  function normalizeFoundationInput(raw) {
    if (!raw) return null;
    if (foundations[raw]) return raw;
    for (const symbol of suits) {
      if (raw.includes(symbol)) return symbol;
    }
    const cleaned = raw.replace(/[^A-Z]/gi, "").toUpperCase();
    return foundationAliases[cleaned] || null;
  }

  function drawCardFromStock() {
    if (!stock.length) {
      stock = waste.reverse().map((c) => ({ ...c, up: false }));
      waste = [];
      appendLine("RESHUFFLING WASTE INTO STOCK.", "system");
    }
    if (stock.length) {
      const card = stock.pop();
      card.up = true;
      waste.push(card);
    }
    render();
    maybeAutoComplete();
  }

  function canPlaceOnTableau(card, destCard) {
    if (!destCard) return card.r === "K";
    return (
      cardColor(card) !== cardColor(destCard) &&
      rankIndex(card.r) === rankIndex(destCard.r) - 1
    );
  }

  function canPlaceOnFoundation(card, suitSymbol = card.s) {
    const pile = foundations[suitSymbol];
    if (!pile || card.s !== suitSymbol) return false;
    const expected =
      pile.length === 0 ? 0 : rankIndex(pile[pile.length - 1].r) + 1;
    return rankIndex(card.r) === expected;
  }

  function moveWaste(target) {
    if (!waste.length) {
      appendLine("NO CARD IN WASTE.");
      return;
    }
    const card = waste[waste.length - 1];
    if (target.startsWith("T")) {
      const idx = parseInt(target.slice(1), 10) - 1;
      const dest = tableaus[idx];
      if (!dest) return appendLine("UNKNOWN TABLEAU.");
      const top = dest.length ? dest[dest.length - 1] : null;
      if (canPlaceOnTableau(card, top)) {
        waste.pop();
        dest.push(card);
      } else {
        appendLine("CANNOT PLACE WASTE THERE.");
      }
    } else if (target.startsWith("F")) {
      const suit = normalizeFoundationInput(target);
      if (!suit)
        return appendLine("UNKNOWN FOUNDATION. USE FHEART/FSPADE/FCLUB/FDIAMOND.");
      if (canPlaceOnFoundation(card, suit)) {
        waste.pop();
        foundations[suit].push(card);
      } else {
        appendLine("CANNOT PLACE ON FOUNDATION.");
      }
    }
    render();
    checkWin();
    maybeAutoComplete();
  }

  function moveTableau(sourceIdx, dest, count) {
    const src = tableaus[sourceIdx];
    if (!src || !src.length) return appendLine("SOURCE EMPTY.");
    if (count > src.length) return appendLine("NOT ENOUGH CARDS.");
    const moving = src.slice(src.length - count);
    if (!moving[0].up) return appendLine("TURN CARDS FACE UP FIRST (FLIP).");
    if (dest.startsWith("T")) {
      const destIdx = parseInt(dest.slice(1), 10) - 1;
      const dst = tableaus[destIdx];
      if (!dst) return appendLine("UNKNOWN TABLEAU.");
      const destTop = dst.length ? dst[dst.length - 1] : null;
      if (!canPlaceOnTableau(moving[0], destTop))
        return appendLine("ILLEGAL TABLEAU MOVE.");
      tableaus[sourceIdx] = src.slice(0, src.length - count);
      dst.push(...moving);
    } else if (dest.startsWith("F") && count === 1) {
      const suit = normalizeFoundationInput(dest);
      if (!suit)
        return appendLine("UNKNOWN FOUNDATION. USE FHEART/FSPADE/FCLUB/FDIAMOND.");
      if (!canPlaceOnFoundation(moving[0], suit))
        return appendLine("ILLEGAL FOUNDATION MOVE.");
      tableaus[sourceIdx].pop();
      foundations[suit].push(moving[0]);
    } else {
      return appendLine("INVALID DESTINATION.");
    }
    if (
      tableaus[sourceIdx].length &&
      !tableaus[sourceIdx][tableaus[sourceIdx].length - 1].up
    ) {
      tableaus[sourceIdx][tableaus[sourceIdx].length - 1].up = true;
    }
    render();
    checkWin();
    maybeAutoComplete();
  }

  function flipTableau(idx) {
    const pile = tableaus[idx];
    if (!pile || !pile.length) return appendLine("NOTHING TO FLIP.");
    const top = pile[pile.length - 1];
    if (top.up) return appendLine("TOP CARD ALREADY FACE UP.");
    top.up = true;
    render();
    maybeAutoComplete();
  }

  function totalFoundationCards() {
    return Object.values(foundations).reduce((s, p) => s + p.length, 0);
  }

  function checkWin({ silent = false } = {}) {
    const total = totalFoundationCards();
    if (total === 52) {
      if (!silent) appendLine("SOLITAIRE COMPLETE. WELL DONE!", "system");
      return true;
    }
    return false;
  }

  function readyForAutoComplete() {
    if (stock.length) return false;
    return tableaus.every((pile) => pile.every((card) => card.up));
  }

  function findAutoMove() {
    const wasteCard = waste[waste.length - 1];
    if (wasteCard && canPlaceOnFoundation(wasteCard, wasteCard.s)) {
      return { type: "waste" };
    }
    for (let i = 0; i < tableaus.length; i++) {
      const pile = tableaus[i];
      if (!pile.length) continue;
      const card = pile[pile.length - 1];
      if (!card.up) continue;
      if (canPlaceOnFoundation(card, card.s)) {
        return { type: "tableau", index: i };
      }
    }
    return null;
  }

  function stepAutoComplete() {
    if (!autoCompleting) return;
    const move = findAutoMove();
    if (!move) {
      if (checkWin({ silent: true })) {
        appendLine("AUTO-COMPLETE COMPLETE. CONGRATULATIONS, COMMANDER!", "system");
      } else {
        appendLine("AUTO-COMPLETE PAUSED. MANUAL ASSISTANCE REQUIRED.", "warn");
      }
      stopAutoComplete();
      return;
    }
    if (move.type === "waste") {
      const card = waste.pop();
      foundations[card.s].push(card);
    } else if (move.type === "tableau") {
      const pile = tableaus[move.index];
      const card = pile.pop();
      foundations[card.s].push(card);
      if (pile.length && !pile[pile.length - 1].up) {
        pile[pile.length - 1].up = true;
      }
    }
    render();
    if (checkWin({ silent: true })) {
      appendLine("AUTO-COMPLETE COMPLETE. CONGRATULATIONS, COMMANDER!", "system");
      stopAutoComplete();
      return;
    }
    autoTimer = setTimeout(stepAutoComplete, 350);
  }

  function startAutoComplete() {
    if (autoCompleting) return;
    autoCompleting = true;
    appendLine("AUTO-COMPLETE PROTOCOL INITIATED. STAND BY...", "system");
    autoTimer = setTimeout(stepAutoComplete, 400);
  }

  function maybeAutoComplete() {
    if (autoCompleting) return;
    if (!readyForAutoComplete()) return;
    if (!findAutoMove()) return;
    startAutoComplete();
  }

  function start() {
    reset();
  }

  function handleInput(raw) {
    const text = raw.trim();
    const upper = text.toUpperCase();
    if (upper === "EXIT" || upper === "/EXIT" || upper === "QUIT") {
      appendLine("EXITING SOLITAIRE. RETURNING TO TERMINAL.", "system");
      stopAutoComplete();
      exitToTerminal();
      return;
    }
    if (upper === "RESET") {
      reset();
      return;
    }
    if (upper === "HELP") {
      showHelp();
      return;
    }
    if (autoCompleting) {
      appendLine(
        "AUTO-COMPLETE IN PROGRESS. PLEASE WAIT OR TYPE RESET TO REDEAL.",
        "system"
      );
      return;
    }
    if (upper === "DRAW") {
      drawCardFromStock();
      return;
    }
    const parts = text.split(/\s+/);
    if (parts[0].toUpperCase() === "MOVE") {
      if (parts.length < 3)
        return appendLine("USAGE: MOVE SOURCE DEST [COUNT].");
      const source = parts[1].toUpperCase();
      const dest = parts[2].toUpperCase();
      const count = parts[3] ? parseInt(parts[3], 10) : 1;
      if (source === "WASTE") {
        moveWaste(dest);
        return;
      }
      if (source.startsWith("T")) {
        const idx = parseInt(source.slice(1), 10) - 1;
        moveTableau(idx, dest, count || 1);
        return;
      }
    }
    if (parts[0].toUpperCase() === "FLIP" && parts[1]) {
      const idx = parseInt(parts[1].slice(1), 10) - 1;
      flipTableau(idx);
      return;
    }
    appendLine("UNKNOWN COMMAND. TRY DRAW, MOVE, FLIP, RESET, OR EXIT.");
  }

  return { start, handleInput };
}
