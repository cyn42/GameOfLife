import {
  COLS, ROWS,
  createGrid, randomizeGrid,
  nextGeneration as computeNextGeneration,
  ageToColor, cellSize,
} from './game-core.js';

// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playPauseBtn = document.getElementById('playPauseBtn');
const stepBtn = document.getElementById('stepBtn');
const clearBtn = document.getElementById('clearBtn');
const randomizeBtn = document.getElementById('randomizeBtn');
const speedSlider = document.getElementById('speedSlider');
const genCounter = document.getElementById('genCounter');

// --- State ---
let grid = createGrid();
let generation = 0;
let running = false;
let intervalId = null;
let painting = false;
let paintValue = 1;

// --- Rendering ---
function resizeCanvas() {
  const size = cellSize(window.innerWidth, window.innerHeight);
  canvas.width = size * COLS;
  canvas.height = size * ROWS;
}

function draw() {
  const size = cellSize(window.innerWidth, window.innerHeight);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const age = grid[r][c];
      if (age === 0) continue;
      const rgb = ageToColor(age);
      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(c * size, r * size, size - 1, size - 1);
    }
  }

  // Faint grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * size, 0);
    ctx.lineTo(c * size, canvas.height);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * size);
    ctx.lineTo(canvas.width, r * size);
    ctx.stroke();
  }
}

// --- Controls ---
function updateGenDisplay() {
  genCounter.textContent = `Generation: ${generation}`;
}

function step() {
  grid = computeNextGeneration(grid);
  generation++;
  updateGenDisplay();
}

function scheduleStep() {
  if (!running) return;
  intervalId = setTimeout(() => {
    step();
    draw();
    scheduleStep();
  }, parseInt(speedSlider.value, 10));
}

function start() {
  if (running) return;
  running = true;
  playPauseBtn.textContent = 'Pause';
  scheduleStep();
}

function stop() {
  running = false;
  playPauseBtn.textContent = 'Play';
  if (intervalId !== null) {
    clearTimeout(intervalId);
    intervalId = null;
  }
}

playPauseBtn.addEventListener('click', () => {
  running ? stop() : start();
});

stepBtn.addEventListener('click', () => {
  if (!running) {
    step();
    draw();
  }
});

clearBtn.addEventListener('click', () => {
  stop();
  grid = createGrid();
  generation = 0;
  updateGenDisplay();
  draw();
});

randomizeBtn.addEventListener('click', () => {
  stop();
  grid = randomizeGrid();
  generation = 0;
  updateGenDisplay();
  draw();
});

speedSlider.addEventListener('input', () => {
  if (running) {
    clearTimeout(intervalId);
    scheduleStep();
  }
});

// --- Mouse interaction ---
function getCellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const size = cellSize(window.innerWidth, window.innerHeight);
  const c = Math.floor((e.clientX - rect.left) / size);
  const r = Math.floor((e.clientY - rect.top) / size);
  if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
  return null;
}

canvas.addEventListener('mousedown', (e) => {
  const cell = getCellFromEvent(e);
  if (!cell) return;
  painting = true;
  paintValue = grid[cell.r][cell.c] > 0 ? 0 : 1;
  grid[cell.r][cell.c] = paintValue;
  draw();
});

canvas.addEventListener('mousemove', (e) => {
  if (!painting) return;
  const cell = getCellFromEvent(e);
  if (!cell) return;
  grid[cell.r][cell.c] = paintValue;
  draw();
});

window.addEventListener('mouseup', () => {
  painting = false;
});

// --- Init ---
window.addEventListener('resize', () => {
  resizeCanvas();
  draw();
});

resizeCanvas();
grid = randomizeGrid();
updateGenDisplay();
draw();
