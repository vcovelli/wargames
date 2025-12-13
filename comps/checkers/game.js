export function createGame({
  appendLine,
  createBoardElement,
  exitToTerminal,
}) {
  let board = [];
  let turn = "R";
  let vsAI = true;
  let gameOver = false;
  let aiDifficulty = "easy";
  const checkerIcons = {
    R: { normal: "⛂", king: "⛁" },
    B: { normal: "⛀", king: "⛃" },
  };

  function reset() {
    board = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) board[r][c] = { c: "B", k: false };
      }
    }
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) board[r][c] = { c: "R", k: false };
      }
    }
    turn = "R";
    gameOver = false;
  }

  function drawBoard() {
    appendLine("");
    const boardEl = createBoardElement(8, (r, c) => {
      const p = board[r][c];
      if (!p) return "";
      const cls = p.c === "R" ? "checker-red" : "checker-black";
      const icon = p.k ? checkerIcons[p.c].king : checkerIcons[p.c].normal;
      return { text: icon, className: cls };
    });
    appendLine(boardEl);
    appendLine("");
  }

  function coordToIdx(coord) {
    const files = "abcdefgh";
    const file = coord[0].toLowerCase();
    const rank = parseInt(coord[1], 10);
    const c = files.indexOf(file);
    const r = 8 - rank;
    if (c === -1 || Number.isNaN(r)) return null;
    return { r, c };
  }

  function validMovesFrom(r, c, piece) {
    if (!piece) return [];
    const dirs = [];
    if (piece.c === "R" || piece.k) dirs.push([-1, -1], [-1, 1]);
    if (piece.c === "B" || piece.k) dirs.push([1, -1], [1, 1]);
    const moves = [];
    dirs.forEach(([dr, dc]) => {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (!board[nr][nc]) moves.push({ r: nr, c: nc, capture: false });
        else if (board[nr][nc].c !== piece.c) {
          const jr = nr + dr;
          const jc = nc + dc;
          if (
            jr >= 0 &&
            jr < 8 &&
            jc >= 0 &&
            jc < 8 &&
            !board[jr][jc]
          ) {
            moves.push({
              r: jr,
              c: jc,
              capture: true,
              jumped: { r: nr, c: nc },
            });
          }
        }
      }
    });
    return moves;
  }

  function allMoves(color) {
    const list = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.c === color) {
          validMovesFrom(r, c, p).forEach((m) =>
            list.push({ from: { r, c }, ...m })
          );
        }
      }
    }
    return list;
  }

  function attemptMove(from, to) {
    const piece = board[from.r][from.c];
    if (!piece) {
      appendLine("NO PIECE AT SOURCE.");
      return false;
    }
    if (piece.c !== turn) {
      appendLine("NOT YOUR TURN.");
      return false;
    }
    const moves = validMovesFrom(from.r, from.c, piece);
    const selected = moves.find((m) => m.r === to.r && m.c === to.c);
    if (!selected) {
      appendLine("ILLEGAL MOVE.");
      return false;
    }
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    if (selected.capture && selected.jumped) {
      board[selected.jumped.r][selected.jumped.c] = null;
    }
    if (piece.c === "R" && to.r === 0) piece.k = true;
    if (piece.c === "B" && to.r === 7) piece.k = true;
    drawBoard();
    const enemy = allMoves(turn === "R" ? "B" : "R");
    if (!enemy.length) {
      appendLine(`${turn === "R" ? "RED" : "BLACK"} WINS!`, "system");
      gameOver = true;
      appendLine("TYPE RESET TO PLAY AGAIN OR EXIT TO RETURN.", "system");
      return true;
    }
    turn = turn === "R" ? "B" : "R";
    return true;
  }

  function aiMove() {
    const moves = allMoves("B");
    if (!moves.length) return;
    let choice;
    if (aiDifficulty === "hard") {
      const captures = moves.filter((m) => m.capture);
      if (captures.length) {
        choice = captures[Math.floor(Math.random() * captures.length)];
      } else {
        choice = moves[Math.floor(Math.random() * moves.length)];
      }
    } else {
      choice = moves[Math.floor(Math.random() * moves.length)];
    }
    attemptMove(choice.from, { r: choice.r, c: choice.c });
  }

  function start() {
    reset();
    appendLine("CHECKERS", "system");
    appendLine('ENTER MOVES LIKE "A3 B4" (FROM TO).', "system");
    appendLine(
      "TYPE MODE HUMAN FOR PASS-AND-PLAY, MODE AI FOR WOPR OPPONENT.",
      "system"
    );
    appendLine("TYPE AI EASY OR AI HARD TO SET WOPR DIFFICULTY.", "system");
    appendLine("TYPE RESET TO RESTART, EXIT TO LEAVE.", "system");
    drawBoard();
  }

  function handleInput(raw) {
    const text = raw.trim();
    const upper = text.toUpperCase();
    if (upper === "EXIT" || upper === "/EXIT" || upper === "QUIT") {
      appendLine("EXITING CHECKERS. RETURNING TO TERMINAL.", "system");
      exitToTerminal();
      return;
    }
    if (upper === "RESET") {
      reset();
      drawBoard();
      return;
    }
    if (upper === "MODE HUMAN") {
      vsAI = false;
      appendLine("MODE SET: HUMAN VS HUMAN.");
      return;
    }
    if (upper === "MODE AI") {
      vsAI = true;
      appendLine("MODE SET: HUMAN VS WOPR.");
      return;
    }
    if (upper === "AI EASY") {
      aiDifficulty = "easy";
      appendLine("WOPR CHECKERS AI SET TO EASY.");
      return;
    }
    if (upper === "AI HARD") {
      aiDifficulty = "hard";
      appendLine("WOPR CHECKERS AI SET TO HARD.");
      return;
    }
    if (gameOver) {
      appendLine("GAME OVER. TYPE RESET OR EXIT.");
      return;
    }
    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      appendLine('ENTER MOVE AS "A3 B4".');
      return;
    }
    const from = coordToIdx(parts[0]);
    const to = coordToIdx(parts[1]);
    if (!from || !to) {
      appendLine("INVALID COORDINATES.");
      return;
    }
    const moved = attemptMove(from, to);
    if (moved && !gameOver && vsAI && turn === "B") {
      appendLine("WOPR PROCESSING...");
      setTimeout(() => {
        if (!gameOver) aiMove();
      }, 300);
    }
  }

  return { start, handleInput };
}
