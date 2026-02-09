# CLAUDE.md — Conway's Game of Life

## Purpose

Interactive browser-based Conway's Game of Life with a heatmap-style renderer.
Cells are colored by age (how many generations they've been alive), producing a
visual gradient from cyan (newborn) through green, yellow, orange, to red
(long-lived). The simulation uses toroidal wrapping so patterns wrap around edges.

## Tech Stack

- **Vanilla HTML/CSS/JS** — no frameworks, no build step
- **ES Modules** — `game-core.js` (pure logic) + `game.js` (DOM/rendering)
- **Canvas 2D API** for rendering the grid
- **Node.js built-in `node:test`** for testing — zero dependencies

## Project Structure

```
index.html        — Page shell: canvas, control bar, legend panel
style.css         — Dark theme, layout, control/legend styling
game-core.js      — Pure logic module (grid, simulation, colors, layout)
game.js           — DOM, rendering, events — imports from game-core.js
package.json      — ES module config + npm test script
test/
  game-core.test.js — 30 tests covering all pure functions
```

## Running

Serve locally (ES modules require a server, not `file://`):

```bash
npx serve        # or: python -m http.server
```

Then open the displayed URL in any modern browser.

## Testing

```bash
npm test
# or: node --test test/game-core.test.js
```

All tests use Node.js built-in `node:test` and `node:assert` — no dependencies to install.

## How the Code Is Organized

### game-core.js — Pure Logic (testable, no DOM)

**Configuration constants:**
- `COLS` / `ROWS` — grid dimensions (80×60)
- `FILL_RATIO` — density for randomize (25%)
- `CANVAS_PADDING_X` / `CANVAS_PADDING_Y` — layout padding
- `COLORS` — named palette object (cyan, green, yellow, orange, red)
- `AGE_BREAKPOINTS` — age band boundaries

**Grid helpers:**
- `createGrid(rows, cols)` — returns 2D `Uint16Array` filled with 0
- `randomizeGrid(rows, cols, fillRatio)` — returns grid with ~fillRatio live cells

**Simulation:**
- `countNeighbors(grid, r, c, rows, cols)` — Moore neighborhood with toroidal wrapping
- `nextGeneration(grid, rows, cols)` — returns **new** grid with GoL rules applied; surviving cells increment age, births start at 1

**Color:**
- `lerpColor(a, b, t)` — linear RGB interpolation
- `ageToColor(age)` — maps age to RGB via piecewise linear interpolation:
  - Age 1: cyan | 2–5: cyan→green | 6–15: green→yellow | 16–30: yellow→orange | 31+: orange→red

**Layout:**
- `cellSize(viewportWidth, viewportHeight, cols, rows)` — computes cell pixel size

### game.js — DOM & Rendering (imports from game-core.js)

- Mutable state: `grid`, `generation`, `running`, `intervalId`, `painting`, `paintValue`
- Rendering: `draw()`, `resizeCanvas()`
- Controls: Play/Pause, Step, Clear, Randomize, Speed slider
- Mouse interaction: click-to-toggle, drag painting
- `setTimeout`-based simulation loop

## Key Design Decisions

- **ES Modules** — clean separation of pure logic from DOM code; enables testing with Node.js
- **`nextGeneration` returns new grid** — pure function, no side effects
- **All pure functions take dimensions as params** — testable with small grids
- **`setTimeout` over `setInterval`/`requestAnimationFrame`** — speed slider controls actual simulation rate
- **`Uint16Array`** — compact storage for cell age; max age 65535 is more than sufficient
- **Toroidal wrapping** — `(r + dr + rows) % rows` avoids boundary checks
- **Age-based heatmap** — distinguishes stable structures (red/orange) from active regions (cyan/green)
- **Named constants** — `CANVAS_PADDING_X/Y`, `COLORS`, `AGE_BREAKPOINTS` replace magic numbers
- **Zero test dependencies** — uses `node:test` + `node:assert` built into Node.js

## Modifying

| Change | Location |
|--------|----------|
| Grid size | `COLS` / `ROWS` in `game-core.js` |
| Random fill density | `FILL_RATIO` in `game-core.js` |
| Color scheme | `COLORS`, `AGE_BREAKPOINTS`, `ageToColor()` in `game-core.js` |
| Speed range | `min` / `max` attributes on `#speedSlider` in `index.html` |
| Layout/theme | `style.css` |
| Legend entries | `#legend` div in `index.html` (keep in sync with `ageToColor`) |
