export function createGame({ appendLine, exitToTerminal }) {
  let board;
  let gameOver;
  let aiDifficulty = "normal";

  function reset() {
    board = Array(9).fill(null);
    gameOver = false;
  }

  function drawBoard() {
    const toChar = (i) => board[i] || (i + 1).toString();
    const rows = [
      ` ${toChar(0)} | ${toChar(1)} | ${toChar(2)} `,
      "---+---+---",
      ` ${toChar(3)} | ${toChar(4)} | ${toChar(5)} `,
      "---+---+---",
      ` ${toChar(6)} | ${toChar(7)} | ${toChar(8)} `,
    ];
    appendLine("");
    rows.forEach((r) => appendLine(r));
    appendLine("");
  }

  function checkWinner(b) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const [a, c, d] of lines) {
      if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    }
    if (b.every((cell) => cell)) return "DRAW";
    return null;
  }

  function availableMoves(b) {
    const moves = [];
    b.forEach((cell, idx) => {
      if (!cell) moves.push(idx);
    });
    return moves;
  }

  function minimax(currentBoard, player) {
    const winner = checkWinner(currentBoard);
    if (winner === "O") return { score: 1 };
    if (winner === "X") return { score: -1 };
    if (winner === "DRAW") return { score: 0 };

    const moves = availableMoves(currentBoard);
    if (!moves.length) return { score: 0 };

    let bestScore = player === "O" ? -Infinity : Infinity;
    let bestMove = moves[0];

    moves.forEach((move) => {
      const next = currentBoard.slice();
      next[move] = player;
      const { score } = minimax(next, player === "O" ? "X" : "O");
      if (player === "O") {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    });

    return { score: bestScore, move: bestMove };
  }

  function aiMove() {
    const moves = availableMoves(board);
    if (!moves.length) return;
    let choice;
    if (aiDifficulty === "hard") {
      const { move } = minimax(board.slice(), "O") || {};
      choice =
        typeof move === "number"
          ? move
          : moves[Math.floor(Math.random() * moves.length)];
    } else {
      choice = moves[Math.floor(Math.random() * moves.length)];
    }
    board[choice] = "O";
  }

  function processMove(posStr) {
    const pos = parseInt(posStr, 10);
    if (Number.isNaN(pos) || pos < 1 || pos > 9) {
      appendLine("ENTER A POSITION 1-9.");
      return;
    }
    const idx = pos - 1;
    if (board[idx]) {
      appendLine("SQUARE ALREADY TAKEN.");
      return;
    }

    board[idx] = "X";
    let result = checkWinner(board);
    drawBoard();
    if (result) {
      if (result === "DRAW") appendLine("GAME RESULT: DRAW.");
      else appendLine(`WINNER: ${result}`);
      gameOver = true;
      appendLine("");
      appendLine("TYPE PLAY TO START AGAIN OR EXIT TO RETURN.");
      return;
    }

    aiMove();
    result = checkWinner(board);
    drawBoard();
    if (result) {
      if (result === "DRAW") appendLine("GAME RESULT: DRAW.");
      else appendLine(`WINNER: ${result}`);
      gameOver = true;
      appendLine("");
      appendLine("TYPE PLAY TO START AGAIN OR EXIT TO RETURN.");
    }
  }

  function start() {
    reset();
    appendLine("TIC-TAC-TOE", "system");
    appendLine("", "system");
    appendLine("YOU ARE X. COMPUTER IS O.", "system");
    appendLine("ENTER A NUMBER (1-9) TO PLACE YOUR MARK.", "system");
    appendLine(
      "TYPE DIFFICULTY EASY OR DIFFICULTY HARD TO SET AI LEVEL.",
      "system"
    );
    appendLine("TYPE EXIT TO LEAVE THE GAME.", "system");
    drawBoard();
  }

  function handleInput(raw) {
    const trimmed = raw.trim();
    const cmd = trimmed.toUpperCase();

    if (cmd === "EXIT" || cmd === "/EXIT" || cmd === "QUIT") {
      appendLine("EXITING TIC-TAC-TOE. RETURNING TO TERMINAL.", "system");
      exitToTerminal();
      return;
    }

    if (cmd === "DIFFICULTY EASY") {
      aiDifficulty = "easy";
      appendLine("WOPR SET TO EASY MODE.");
      return;
    }

    if (cmd === "DIFFICULTY HARD") {
      aiDifficulty = "hard";
      appendLine("WOPR SET TO HARD MODE.");
      return;
    }

    if (gameOver) {
      if (cmd === "PLAY") {
        reset();
        drawBoard();
      } else {
        appendLine("GAME OVER. TYPE PLAY OR EXIT.");
      }
      return;
    }

    processMove(trimmed);
  }

  return { start, handleInput };
}
