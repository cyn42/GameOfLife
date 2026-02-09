import { describe, test } from 'node:test';
import { strictEqual, deepStrictEqual, ok, notStrictEqual } from 'node:assert';
import {
  COLS, ROWS, COLORS, AGE_BREAKPOINTS,
  createGrid, randomizeGrid,
  countNeighbors, nextGeneration,
  lerpColor, ageToColor,
  cellSize,
} from '../game-core.js';

// ─── createGrid ─────────────────────────────────────────────

describe('createGrid', () => {
  test('default dimensions match ROWS x COLS', () => {
    const grid = createGrid();
    strictEqual(grid.length, ROWS);
    strictEqual(grid[0].length, COLS);
  });

  test('custom dimensions work', () => {
    const grid = createGrid(3, 4);
    strictEqual(grid.length, 3);
    strictEqual(grid[0].length, 4);
  });

  test('all cells initialize to 0', () => {
    const grid = createGrid(5, 5);
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        strictEqual(grid[r][c], 0);
      }
    }
  });
});

// ─── countNeighbors ─────────────────────────────────────────

describe('countNeighbors', () => {
  test('interior cell with all 8 neighbors alive returns 8', () => {
    const grid = createGrid(5, 5);
    // Fill a 3x3 block around (2,2)
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 3; c++) {
        grid[r][c] = 1;
      }
    }
    strictEqual(countNeighbors(grid, 2, 2, 5, 5), 8);
  });

  test('isolated cell has 0 neighbors', () => {
    const grid = createGrid(5, 5);
    grid[2][2] = 1;
    strictEqual(countNeighbors(grid, 2, 2, 5, 5), 0);
  });

  test('wraps top to bottom', () => {
    const grid = createGrid(5, 5);
    grid[4][2] = 1; // bottom row
    // Cell at (0,2) should see bottom-row neighbor
    strictEqual(countNeighbors(grid, 0, 2, 5, 5), 1);
  });

  test('wraps left to right', () => {
    const grid = createGrid(5, 5);
    grid[2][4] = 1; // rightmost col
    // Cell at (2,0) should see right-edge neighbor
    strictEqual(countNeighbors(grid, 2, 0, 5, 5), 1);
  });

  test('wraps diagonally at corner', () => {
    const grid = createGrid(5, 5);
    grid[4][4] = 1; // bottom-right corner
    // Cell at (0,0) should see it as a diagonal neighbor
    strictEqual(countNeighbors(grid, 0, 0, 5, 5), 1);
  });

  test('does not count the cell itself', () => {
    const grid = createGrid(5, 5);
    grid[2][2] = 5; // alive with age 5
    strictEqual(countNeighbors(grid, 2, 2, 5, 5), 0);
  });
});

// ─── nextGeneration — Game of Life rules ────────────────────

describe('nextGeneration', () => {
  test('still life: block stays unchanged', () => {
    const grid = createGrid(6, 6);
    // 2x2 block at (2,2)
    grid[2][2] = 1; grid[2][3] = 1;
    grid[3][2] = 1; grid[3][3] = 1;
    const next = nextGeneration(grid, 6, 6);
    ok(next[2][2] > 0);
    ok(next[2][3] > 0);
    ok(next[3][2] > 0);
    ok(next[3][3] > 0);
    // Surrounding cells remain dead
    strictEqual(next[1][1], 0);
    strictEqual(next[1][4], 0);
  });

  test('oscillator: blinker toggles orientation', () => {
    // Horizontal blinker at row 2
    const grid = createGrid(5, 5);
    grid[2][1] = 1; grid[2][2] = 1; grid[2][3] = 1;
    const next = nextGeneration(grid, 5, 5);
    // Should become vertical
    strictEqual(next[2][1], 0);
    strictEqual(next[2][3], 0);
    ok(next[1][2] > 0);
    ok(next[2][2] > 0);
    ok(next[3][2] > 0);
  });

  test('glider shifts by (1,1) after 4 generations', () => {
    const grid = createGrid(10, 10);
    // Standard glider
    grid[0][1] = 1;
    grid[1][2] = 1;
    grid[2][0] = 1; grid[2][1] = 1; grid[2][2] = 1;

    let current = grid;
    for (let i = 0; i < 4; i++) {
      current = nextGeneration(current, 10, 10);
    }
    // Glider should have moved +1 row, +1 col
    ok(current[1][2] > 0);
    ok(current[2][3] > 0);
    ok(current[3][1] > 0);
    ok(current[3][2] > 0);
    ok(current[3][3] > 0);
  });

  test('underpopulation: isolated cell dies', () => {
    const grid = createGrid(5, 5);
    grid[2][2] = 1;
    const next = nextGeneration(grid, 5, 5);
    strictEqual(next[2][2], 0);
  });

  test('overpopulation: cell with 4+ neighbors dies', () => {
    const grid = createGrid(5, 5);
    // Cross pattern: center has 4 neighbors
    grid[2][2] = 1;
    grid[1][2] = 1; grid[3][2] = 1;
    grid[2][1] = 1; grid[2][3] = 1;
    const next = nextGeneration(grid, 5, 5);
    strictEqual(next[2][2], 0);
  });

  test('reproduction: dead cell with exactly 3 neighbors is born', () => {
    const grid = createGrid(5, 5);
    grid[1][1] = 1; grid[1][2] = 1; grid[2][1] = 1;
    // Cell (2,2) has 3 neighbors → born
    const next = nextGeneration(grid, 5, 5);
    strictEqual(next[2][2], 1);
  });
});

// ─── Age tracking ───────────────────────────────────────────

describe('age tracking', () => {
  test('newborn cell starts at age 1', () => {
    const grid = createGrid(5, 5);
    grid[1][1] = 1; grid[1][2] = 1; grid[2][1] = 1;
    const next = nextGeneration(grid, 5, 5);
    strictEqual(next[2][2], 1);
  });

  test('surviving cell increments age each generation', () => {
    // Block pattern: each cell survives every generation
    const grid = createGrid(6, 6);
    grid[2][2] = 1; grid[2][3] = 1;
    grid[3][2] = 1; grid[3][3] = 1;
    let current = grid;
    for (let i = 0; i < 3; i++) {
      current = nextGeneration(current, 6, 6);
    }
    // After 3 generations, each cell should be age 4 (started 1, +3)
    strictEqual(current[2][2], 4);
    strictEqual(current[2][3], 4);
    strictEqual(current[3][2], 4);
    strictEqual(current[3][3], 4);
  });

  test('dead cell resets to age 0', () => {
    const grid = createGrid(5, 5);
    grid[2][2] = 10; // was alive with high age
    // No neighbors → dies
    const next = nextGeneration(grid, 5, 5);
    strictEqual(next[2][2], 0);
  });
});

// ─── lerpColor ──────────────────────────────────────────────

describe('lerpColor', () => {
  test('t=0 returns first color', () => {
    deepStrictEqual(lerpColor([0, 100, 200], [255, 0, 50], 0), [0, 100, 200]);
  });

  test('t=1 returns second color', () => {
    deepStrictEqual(lerpColor([0, 100, 200], [255, 0, 50], 1), [255, 0, 50]);
  });

  test('t=0.5 returns midpoint', () => {
    deepStrictEqual(lerpColor([0, 0, 0], [100, 200, 50], 0.5), [50, 100, 25]);
  });
});

// ─── ageToColor ─────────────────────────────────────────────

describe('ageToColor', () => {
  test('age 0 returns null', () => {
    strictEqual(ageToColor(0), null);
  });

  test('age 1 returns cyan', () => {
    deepStrictEqual(ageToColor(1), [0, 255, 255]);
  });

  test('age 5 returns end of cyan-green band', () => {
    const color = ageToColor(5);
    ok(Array.isArray(color));
    // At age 5 (end of band), should be close to green
    ok(color[1] <= 255, 'green channel in range');
    ok(color[0] <= 10, 'red channel near zero');
  });

  test('age 15 returns yellow-ish', () => {
    const color = ageToColor(15);
    // End of green-yellow band → should be near yellow [255, 255, 0]
    ok(color[0] >= 200, 'red component high');
    ok(color[1] >= 200, 'green component high');
    ok(color[2] <= 50, 'blue component low');
  });

  test('age 30 returns orange', () => {
    const color = ageToColor(30);
    // End of yellow-orange band → [255, 140, 0]
    deepStrictEqual(color, [255, 140, 0]);
  });

  test('age 1000 clamps to red', () => {
    const color = ageToColor(1000);
    // Should be clamped to COLORS.red = [255, 40, 20]
    deepStrictEqual(color, [255, 40, 20]);
  });

  test('returns array copy, not reference to COLORS constant', () => {
    const color = ageToColor(1);
    color[0] = 999;
    // COLORS.cyan should be unmodified
    deepStrictEqual(COLORS.cyan, [0, 255, 255]);
  });
});

// ─── cellSize ───────────────────────────────────────────────

describe('cellSize', () => {
  test('correct computation for given viewport', () => {
    // (820 - 20) / 80 = 10, (670 - 70) / 60 = 10 → min = 10
    strictEqual(cellSize(820, 670, 80, 60), 10);
  });

  test('constrained by smaller dimension', () => {
    // Width: (420 - 20) / 80 = 5
    // Height: (670 - 70) / 60 = 10
    // Min = 5
    strictEqual(cellSize(420, 670, 80, 60), 5);
  });
});
