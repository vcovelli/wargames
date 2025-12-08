export function createGame({ print, printLines, exitGame }) {
  let board;
  let currentPlayer;
  let gameOver;

  function reset() {
    board = Array(9).fill(null);
    currentPlayer = "X"; // user is X
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
    print("");
    rows.forEach(print);
    print("");
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

  function aiMove() {
    // very simple AI: first free spot
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        break;
      }
    }
  }

  function processMove(posStr) {
    const pos = parseInt(posStr, 10);
    if (Number.isNaN(pos) || pos < 1 || pos > 9) {
      print("ENTER A POSITION 1-9.");
      return;
    }
    const idx = pos - 1;
    if (board[idx]) {
      print("SQUARE ALREADY TAKEN.");
      return;
    }
    board[idx] = "X";

    let result = checkWinner(board);
    drawBoard();
    if (result) {
      if (result === "DRAW") print("GAME RESULT: DRAW.");
      else print(`WINNER: ${result}`);
      gameOver = true;
      print("");
      print("TYPE PLAY TO START AGAIN OR EXIT TO RETURN.");
      return;
    }

    // AI turn
    aiMove();
    result = checkWinner(board);
    drawBoard();
    if (result) {
      if (result === "DRAW") print("GAME RESULT: DRAW.");
      else print(`WINNER: ${result}`);
      gameOver = true;
      print("");
      print("TYPE PLAY TO START AGAIN OR EXIT TO RETURN.");
      return;
    }
  }

  function start() {
    reset();
    printLines([
      "TIC TAC TOE",
      "",
      "YOU ARE X. COMPUTER IS O.",
      "ENTER A NUMBER (1-9) TO PLACE YOUR MARK.",
      "TYPE EXIT TO LEAVE THE GAME.",
    ]);
    drawBoard();
  }

  function handleCommand(raw) {
    const cmd = raw.trim().toUpperCase();

    if (cmd === "EXIT" || cmd === "QUIT") {
      exitGame();
      return;
    }

    if (cmd === "PLAY" && gameOver) {
      reset();
      drawBoard();
      return;
    }

    if (gameOver) {
      print("GAME OVER. TYPE PLAY OR EXIT.");
      return;
    }

    processMove(raw.trim());
  }

  return { start, handleCommand };
}
