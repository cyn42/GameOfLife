// --- Configuration ---
export const COLS = 80;
export const ROWS = 60;
export const FILL_RATIO = 0.25;
export const CANVAS_PADDING_X = 20;
export const CANVAS_PADDING_Y = 70;

// --- Color palette ---
export const COLORS = {
  cyan:   [0, 255, 255],
  green:  [0, 200, 0],
  yellow: [255, 255, 0],
  orange: [255, 140, 0],
  red:    [255, 40, 20],
};

export const AGE_BREAKPOINTS = {
  cyanGreen:    5,   // ages 2–5
  greenYellow:  15,  // ages 6–15
  yellowOrange: 30,  // ages 16–30
  orangeRed:    61,  // ages 31–61 (clamped beyond)
};

// --- Grid helpers ---
export function createGrid(rows = ROWS, cols = COLS) {
  return Array.from({ length: rows }, () => new Uint16Array(cols));
}

export function randomizeGrid(rows = ROWS, cols = COLS, fillRatio = FILL_RATIO) {
  const grid = createGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      grid[r][c] = Math.random() < fillRatio ? 1 : 0;
    }
  }
  return grid;
}

// --- Simulation ---
export function countNeighbors(grid, r, c, rows = ROWS, cols = COLS) {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = (r + dr + rows) % rows;
      const nc = (c + dc + cols) % cols;
      if (grid[nr][nc] > 0) count++;
    }
  }
  return count;
}

export function nextGeneration(grid, rows = ROWS, cols = COLS) {
  const next = createGrid(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const neighbors = countNeighbors(grid, r, c, rows, cols);
      const alive = grid[r][c] > 0;
      if (alive) {
        next[r][c] = (neighbors === 2 || neighbors === 3) ? grid[r][c] + 1 : 0;
      } else {
        next[r][c] = neighbors === 3 ? 1 : 0;
      }
    }
  }
  return next;
}

// --- Color ---
export function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

export function ageToColor(age) {
  if (age === 0) return null;
  if (age === 1) return [...COLORS.cyan];
  if (age <= AGE_BREAKPOINTS.cyanGreen) {
    const t = (age - 1) / 4;
    return lerpColor(COLORS.cyan, COLORS.green, t);
  }
  if (age <= AGE_BREAKPOINTS.greenYellow) {
    const t = (age - 6) / 9;
    return lerpColor(COLORS.green, COLORS.yellow, t);
  }
  if (age <= AGE_BREAKPOINTS.yellowOrange) {
    const t = (age - 16) / 14;
    return lerpColor(COLORS.yellow, COLORS.orange, t);
  }
  const t = Math.min((age - 31) / 30, 1);
  return lerpColor(COLORS.orange, COLORS.red, t);
}

// --- Layout ---
export function cellSize(viewportWidth, viewportHeight, cols = COLS, rows = ROWS) {
  return Math.floor(Math.min(
    (viewportWidth - CANVAS_PADDING_X) / cols,
    (viewportHeight - CANVAS_PADDING_Y) / rows
  ));
}
