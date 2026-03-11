const SIZE = 4;
const START_TILES = 2;
const STORAGE_KEY = "game2048-best";

const boardEl = document.getElementById("board");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlaySubEl = document.getElementById("overlay-sub");
const restartBtn = document.getElementById("restart");
const newGameBtn = document.getElementById("newgame");
const undoBtn = document.getElementById("undo");

let board = [];
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;
let previous = null;

function init() {
  bestEl.textContent = String(best);
  board = createEmpty();
  score = 0;
  previous = null;
  for (let i = 0; i < START_TILES; i += 1) {
    addRandomTile(board);
  }
  render(true);
  hideOverlay();
}

function createEmpty() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function cloneBoard(source) {
  return source.map((row) => row.slice());
}

function addRandomTile(grid) {
  const empty = [];
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (grid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (!empty.length) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return true;
}

function render(initial = false, mergedPositions = []) {
  boardEl.innerHTML = "";
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const value = board[r][c];
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.value = String(value);
      cell.textContent = value === 0 ? "" : String(value);
      if (initial && value !== 0) cell.classList.add("pop");
      if (mergedPositions.some((p) => p[0] === r && p[1] === c)) {
        cell.classList.add("merged");
      }
      boardEl.appendChild(cell);
    }
  }
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function setPrevious() {
  previous = {
    board: cloneBoard(board),
    score,
  };
}

function undo() {
  if (!previous) return;
  board = cloneBoard(previous.board);
  score = previous.score;
  previous = null;
  render();
  hideOverlay();
}

function move(direction) {
  const snapshot = cloneBoard(board);
  const prevScore = score;
  const { moved, mergedPositions, gained } = slide(direction);
  if (!moved) return;
  previous = { board: snapshot, score: prevScore };
  score += gained;
  if (score > best) {
    best = score;
    localStorage.setItem(STORAGE_KEY, String(best));
  }
  addRandomTile(board);
  render(false, mergedPositions);
  if (isGameOver()) {
    showOverlay("Game Over", "没有可移动的格子了");
  }
  if (hasTile(2048)) {
    showOverlay("You Win", "继续挑战更高分数");
  }
}

function slide(direction) {
  let moved = false;
  let gained = 0;
  const mergedPositions = [];

  if (direction === "left" || direction === "right") {
    for (let r = 0; r < SIZE; r += 1) {
      const line = board[r].slice();
      const result = compress(line, direction === "right");
      board[r] = result.line;
      if (result.moved) moved = true;
      if (result.gained) gained += result.gained;
      mergedPositions.push(...result.mergedPositions.map((c) => [r, c]));
    }
  } else {
    for (let c = 0; c < SIZE; c += 1) {
      const line = [];
      for (let r = 0; r < SIZE; r += 1) line.push(board[r][c]);
      const result = compress(line, direction === "down");
      for (let r = 0; r < SIZE; r += 1) board[r][c] = result.line[r];
      if (result.moved) moved = true;
      if (result.gained) gained += result.gained;
      mergedPositions.push(...result.mergedPositions.map((r) => [r, c]));
    }
  }

  return { moved, mergedPositions, gained };
}

function compress(line, reverse) {
  const input = reverse ? line.slice().reverse() : line.slice();
  const filtered = input.filter((v) => v !== 0);
  const output = [];
  const mergedPositions = [];
  let gained = 0;
  for (let i = 0; i < filtered.length; i += 1) {
    if (filtered[i] === filtered[i + 1]) {
      const merged = filtered[i] * 2;
      output.push(merged);
      gained += merged;
      i += 1;
    } else {
      output.push(filtered[i]);
    }
  }
  while (output.length < SIZE) output.push(0);
  const finalLine = reverse ? output.reverse() : output;
  for (let i = 0; i < SIZE; i += 1) {
    if (finalLine[i] !== 0 && finalLine[i] !== line[i]) {
      mergedPositions.push(i);
    }
  }
  const moved = finalLine.some((v, i) => v !== line[i]);
  return { line: finalLine, moved, gained, mergedPositions };
}

function hasTile(value) {
  return board.some((row) => row.some((cell) => cell === value));
}

function isGameOver() {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = board[r][c];
      if (v === 0) return false;
      if (r < SIZE - 1 && board[r + 1][c] === v) return false;
      if (c < SIZE - 1 && board[r][c + 1] === v) return false;
    }
  }
  return true;
}

function showOverlay(title, sub) {
  overlayTitleEl.textContent = title;
  overlaySubEl.textContent = sub;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

function handleKey(e) {
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  };
  if (!map[e.key]) return;
  e.preventDefault();
  move(map[e.key]);
}

let touchStart = null;

function handleTouchStart(e) {
  const touch = e.touches[0];
  if (!touch) return;
  touchStart = { x: touch.clientX, y: touch.clientY, time: Date.now() };
}

function handleTouchEnd(e) {
  if (!touchStart) return;
  const touch = e.changedTouches[0];
  if (!touch) return;
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  const min = 24;
  if (absX < min && absY < min) {
    touchStart = null;
    return;
  }
  if (absX > absY) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
  touchStart = null;
}

document.addEventListener("keydown", handleKey, { passive: false });
boardEl.addEventListener("touchstart", handleTouchStart, { passive: true });
boardEl.addEventListener("touchend", handleTouchEnd, { passive: true });

restartBtn.addEventListener("click", init);
newGameBtn.addEventListener("click", init);
undoBtn.addEventListener("click", undo);

init();
