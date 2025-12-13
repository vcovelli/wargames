export function createGame({
  appendLine,
  createBoardElement,
  exitToTerminal,
}) {
  const files = "abcdefgh";
  const emptyRow = () => Array(8).fill(null);
  let board = [];
  let turn = "W";
  let vsAI = true;
  let gameOver = false;
  let aiDifficulty = "easy";
  const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
  const pieceIcons = {
    W: { p: "♙", r: "♖", n: "♘", b: "♗", q: "♕", k: "♔" },
    B: { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" },
  };

  function resetBoard() {
    board = [
      [
        { t: "r", c: "B" },
        { t: "n", c: "B" },
        { t: "b", c: "B" },
        { t: "q", c: "B" },
        { t: "k", c: "B" },
        { t: "b", c: "B" },
        { t: "n", c: "B" },
        { t: "r", c: "B" },
      ],
      Array(8).fill({ t: "p", c: "B" }),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      emptyRow(),
      Array(8).fill({ t: "p", c: "W" }),
      [
        { t: "r", c: "W" },
        { t: "n", c: "W" },
        { t: "b", c: "W" },
        { t: "q", c: "W" },
        { t: "k", c: "W" },
        { t: "b", c: "W" },
        { t: "n", c: "W" },
        { t: "r", c: "W" },
      ],
    ].map((row) => row.map((p) => (p ? { ...p } : null)));
    turn = "W";
    gameOver = false;
  }

  function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  function renderBoard() {
    appendLine("");
    const boardEl = createBoardElement(8, (r, c) => {
      const piece = board[r][c];
      if (!piece) return "";
      const cls = piece.c === "W" ? "piece-white" : "piece-green";
      const icon = pieceIcons[piece.c]?.[piece.t] || piece.t.toUpperCase();
      return { text: icon, className: cls };
    });
    appendLine(boardEl);
    appendLine("");
  }

  function coordToIdx(coord) {
    if (!coord || coord.length < 2) return null;
    const file = coord[0].toLowerCase();
    const rank = parseInt(coord[1], 10);
    const c = files.indexOf(file);
    const r = 8 - rank;
    if (c === -1 || Number.isNaN(r) || r < 0 || r > 7) return null;
    return { r, c };
  }

  function isEnemy(a, b) {
    return a && b && a.c !== b.c;
  }

  function pushMoveIfValid(moves, r, c, color) {
    if (!inBounds(r, c)) return false;
    const dest = board[r][c];
    if (!dest) {
      moves.push({ r, c });
      return true;
    }
    if (dest.c !== color) {
      moves.push({ r, c });
    }
    return false;
  }

  function rayMoves(r, c, color, deltas) {
    const moves = [];
    deltas.forEach(([dr, dc]) => {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        pushMoveIfValid(moves, nr, nc, color);
        if (board[nr][nc]) break;
        nr += dr;
        nc += dc;
      }
    });
    return moves;
  }

  function movesForPiece(r, c, piece) {
    if (!piece) return [];
    const { t, c: color } = piece;
    const moves = [];
    if (t === "p") {
      const dir = color === "W" ? -1 : 1;
      const startRow = color === "W" ? 6 : 1;
      const one = { r: r + dir, c };
      if (inBounds(one.r, one.c) && !board[one.r][one.c]) moves.push(one);
      const two = { r: r + dir * 2, c };
      if (
        r === startRow &&
        !board[one.r][one.c] &&
        inBounds(two.r, two.c) &&
        !board[two.r][two.c]
      ) {
        moves.push(two);
      }
      const caps = [
        { r: r + dir, c: c + 1 },
        { r: r + dir, c: c - 1 },
      ];
      caps.forEach(({ r: rr, c: cc }) => {
        if (inBounds(rr, cc) && board[rr][cc] && isEnemy(board[rr][cc], piece)) {
          moves.push({ r: rr, c: cc });
        }
      });
    } else if (t === "n") {
      const jumps = [
        [1, 2],
        [2, 1],
        [-1, 2],
        [-2, 1],
        [1, -2],
        [2, -1],
        [-1, -2],
        [-2, -1],
      ];
      jumps.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) return;
        const dest = board[nr][nc];
        if (!dest || dest.c !== color) moves.push({ r: nr, c: nc });
      });
    } else if (t === "b") {
      return rayMoves(r, c, color, [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ]);
    } else if (t === "r") {
      return rayMoves(r, c, color, [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
    } else if (t === "q") {
      return rayMoves(r, c, color, [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]);
    } else if (t === "k") {
      const steps = [
        [1, 1],
        [1, 0],
        [1, -1],
        [0, 1],
        [0, -1],
        [-1, 1],
        [-1, 0],
        [-1, -1],
      ];
      steps.forEach(([dr, dc]) => pushMoveIfValid(moves, r + dr, c + dc, color));
    }
    return moves;
  }

  function allMoves(color) {
    const list = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.c === color) {
          movesForPiece(r, c, p).forEach((dest) => {
            list.push({ from: { r, c }, to: dest });
          });
        }
      }
    }
    return list;
  }

  function findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.c === color && piece.t === "k") {
          return { r, c };
        }
      }
    }
    return null;
  }

  function isSquareAttacked(r, c, byColor) {
    for (let rr = 0; rr < 8; rr++) {
      for (let cc = 0; cc < 8; cc++) {
        const piece = board[rr][cc];
        if (piece && piece.c === byColor) {
          const moves = movesForPiece(rr, cc, piece);
          if (moves.some((m) => m.r === r && m.c === c)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function isKingInCheck(color) {
    const king = findKing(color);
    if (!king) return false;
    const enemy = color === "W" ? "B" : "W";
    return isSquareAttacked(king.r, king.c, enemy);
  }

  function withMoveApplied(from, to, callback) {
    const piece = board[from.r][from.c];
    const dest = board[to.r][to.c];
    const originalType = piece ? piece.t : null;
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    const result = callback();
    board[from.r][from.c] = piece;
    board[to.r][to.c] = dest;
    if (piece && originalType) piece.t = originalType;
    return result;
  }

  function legalMoves(color) {
    const moves = allMoves(color);
    return moves.filter(({ from, to }) => {
      return !withMoveApplied(from, to, () => isKingInCheck(color));
    });
  }

  function attemptMove(from, to) {
    const piece = board[from.r][from.c];
    if (!piece) {
      appendLine("NO PIECE AT SOURCE.");
      return false;
    }
    if (piece.c !== turn) {
      appendLine("NOT YOUR PIECE.");
      return false;
    }
    const moves = movesForPiece(from.r, from.c, piece);
    if (!moves.some((m) => m.r === to.r && m.c === to.c)) {
      appendLine("ILLEGAL MOVE FOR THAT PIECE.");
      return false;
    }
    const leavesKingExposed = withMoveApplied(from, to, () =>
      isKingInCheck(piece.c)
    );
    if (leavesKingExposed) {
      appendLine("MOVE WOULD LEAVE YOUR KING IN CHECK.");
      return false;
    }
    const destPiece = board[to.r][to.c];
    board[to.r][to.c] = piece;
    board[from.r][from.c] = null;
    if (piece.t === "p" && (to.r === 0 || to.r === 7)) piece.t = "q";
    renderBoard();
    if (destPiece && destPiece.t === "k") {
      appendLine(
        `${turn === "W" ? "WHITE" : "BLACK"} CAPTURES THE KING.`,
        "system"
      );
      appendLine("GAME OVER.", "system");
      gameOver = true;
      appendLine("TYPE RESET TO PLAY AGAIN OR EXIT TO RETURN.", "system");
      return true;
    }
    turn = turn === "W" ? "B" : "W";
    const enemyMoves = legalMoves(turn);
    if (!enemyMoves.length) {
      if (isKingInCheck(turn)) {
        appendLine(`${turn === "W" ? "WHITE" : "BLACK"} IS CHECKMATED.`, "system");
        appendLine("GAME OVER.", "system");
      } else {
        appendLine("STALEMATE - NO LEGAL MOVES.", "system");
      }
      gameOver = true;
    } else if (isKingInCheck(turn)) {
      appendLine(`${turn === "W" ? "WHITE" : "BLACK"} IS IN CHECK.`, "warn");
    }
    return true;
  }

  function aiMove() {
    const moves = legalMoves("B");
    if (!moves.length) {
      if (isKingInCheck("B")) {
        appendLine("AI CHECKMATED. YOU WIN!", "system");
      } else {
        appendLine("AI HAS NO MOVES. STALEMATE.", "system");
      }
      gameOver = true;
      return;
    }
    let choice;
    if (aiDifficulty === "hard") {
      let best = moves[0];
      let bestScore = -Infinity;
      moves.forEach((move) => {
        const captured = board[move.to.r][move.to.c];
        const captureScore = captured ? pieceValues[captured.t] : 0;
        const centerBias =
          0.1 *
          (4 - (Math.abs(3.5 - move.to.r) + Math.abs(3.5 - move.to.c)));
        const pressure = withMoveApplied(move.from, move.to, () =>
          isKingInCheck("W") ? 2 : 0
        );
        const score =
          captureScore + centerBias + pressure + Math.random() * 0.05;
        if (score > bestScore) {
          bestScore = score;
          best = move;
        }
      });
      choice = best;
    } else {
      choice = moves[Math.floor(Math.random() * moves.length)];
    }
    attemptMove(choice.from, choice.to);
    if (!gameOver && turn === "B") {
      turn = "W";
    }
  }

  function start() {
    resetBoard();
    appendLine("CHESS", "system");
    appendLine('ENTER MOVES LIKE "E2 E4".', "system");
    appendLine(
      'TYPE "MODE HUMAN" FOR PASS-AND-PLAY OR "MODE AI" TO FACE WOPR.',
      "system"
    );
    appendLine('TYPE "AI EASY" OR "AI HARD" TO TUNE WOPR DIFFICULTY.', "system");
    appendLine("TYPE RESET TO RESTART, EXIT TO LEAVE.", "system");
    renderBoard();
  }

  function handleInput(raw) {
    const text = raw.trim();
    const upper = text.toUpperCase();

    if (upper === "EXIT" || upper === "/EXIT" || upper === "QUIT") {
      appendLine("EXITING CHESS. RETURNING TO TERMINAL.", "system");
      exitToTerminal();
      return;
    }

    if (upper === "RESET") {
      resetBoard();
      renderBoard();
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
      appendLine("WOPR WILL MAKE SIMPLE MOVES.");
      return;
    }

    if (upper === "AI HARD") {
      aiDifficulty = "hard";
      appendLine("WOPR IS CALCULATING MORE AGGRESSIVELY.");
      return;
    }

    if (gameOver) {
      appendLine("GAME OVER. TYPE RESET OR EXIT.");
      return;
    }

    const parts = text.split(/\s+/);
    if (parts.length < 2) {
      appendLine('ENTER A MOVE LIKE "E2 E4".');
      return;
    }
    const from = coordToIdx(parts[0]);
    const to = coordToIdx(parts[1]);
    if (!from || !to) {
      appendLine("INVALID COORDINATES. USE A-H + 1-8.");
      return;
    }
    const moved = attemptMove(from, to);
    if (moved && !gameOver && vsAI && turn === "B") {
      appendLine("WOPR THINKING...");
      setTimeout(() => {
        if (!gameOver) {
          aiMove();
        }
      }, 300);
    }
  }

  return { start, handleInput };
}
