(() => {
    // --- Configuration ---
    const COLS = 80;
    const ROWS = 60;
    const FILL_RATIO = 0.25;

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
    let paintValue = 1; // 1 = draw alive, 0 = erase

    // --- Grid helpers ---
    function createGrid() {
        return Array.from({ length: ROWS }, () => new Uint16Array(COLS));
    }

    function clearGrid() {
        grid = createGrid();
        generation = 0;
        updateGenDisplay();
    }

    function randomizeGrid() {
        grid = createGrid();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                grid[r][c] = Math.random() < FILL_RATIO ? 1 : 0;
            }
        }
        generation = 0;
        updateGenDisplay();
    }

    // --- Simulation ---
    function countNeighbors(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = (r + dr + ROWS) % ROWS;
                const nc = (c + dc + COLS) % COLS;
                if (grid[nr][nc] > 0) count++;
            }
        }
        return count;
    }

    function nextGeneration() {
        const next = createGrid();
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const neighbors = countNeighbors(r, c);
                const alive = grid[r][c] > 0;
                if (alive) {
                    // Survives with 2 or 3 neighbors
                    next[r][c] = (neighbors === 2 || neighbors === 3) ? grid[r][c] + 1 : 0;
                } else {
                    // Born with exactly 3 neighbors
                    next[r][c] = neighbors === 3 ? 1 : 0;
                }
            }
        }
        grid = next;
        generation++;
        updateGenDisplay();
    }

    // --- Rendering ---
    function cellSize() {
        return Math.floor(Math.min(
            (window.innerWidth - 20) / COLS,
            (window.innerHeight - 70) / ROWS
        ));
    }

    function resizeCanvas() {
        const size = cellSize();
        canvas.width = size * COLS;
        canvas.height = size * ROWS;
    }

    function ageToColor(age) {
        if (age === 0) return null;
        if (age === 1) return [0, 255, 255];       // cyan
        if (age <= 5) {
            const t = (age - 1) / 4;               // 0..1 over ages 2-5
            return lerpColor([0, 255, 255], [0, 200, 0], t);  // cyan → green
        }
        if (age <= 15) {
            const t = (age - 6) / 9;
            return lerpColor([0, 200, 0], [255, 255, 0], t);  // green → yellow
        }
        if (age <= 30) {
            const t = (age - 16) / 14;
            return lerpColor([255, 255, 0], [255, 140, 0], t); // yellow → orange
        }
        // 31+
        const t = Math.min((age - 31) / 30, 1);
        return lerpColor([255, 140, 0], [255, 40, 20], t);     // orange → red
    }

    function lerpColor(a, b, t) {
        return [
            Math.round(a[0] + (b[0] - a[0]) * t),
            Math.round(a[1] + (b[1] - a[1]) * t),
            Math.round(a[2] + (b[2] - a[2]) * t),
        ];
    }

    function draw() {
        const size = cellSize();
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

    function scheduleStep() {
        if (!running) return;
        intervalId = setTimeout(() => {
            nextGeneration();
            draw();
            scheduleStep();
        }, parseInt(speedSlider.value, 10));
    }

    playPauseBtn.addEventListener('click', () => {
        running ? stop() : start();
    });

    stepBtn.addEventListener('click', () => {
        if (!running) {
            nextGeneration();
            draw();
        }
    });

    clearBtn.addEventListener('click', () => {
        stop();
        clearGrid();
        draw();
    });

    randomizeBtn.addEventListener('click', () => {
        stop();
        randomizeGrid();
        draw();
    });

    speedSlider.addEventListener('input', () => {
        if (running) {
            clearTimeout(intervalId);
            scheduleStep();
        }
    });

    // --- Mouse interaction (click-to-toggle & drag painting) ---
    function getCellFromEvent(e) {
        const rect = canvas.getBoundingClientRect();
        const size = cellSize();
        const c = Math.floor((e.clientX - rect.left) / size);
        const r = Math.floor((e.clientY - rect.top) / size);
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) return { r, c };
        return null;
    }

    canvas.addEventListener('mousedown', (e) => {
        const cell = getCellFromEvent(e);
        if (!cell) return;
        painting = true;
        // Toggle: if cell is alive, erase; otherwise draw
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
    draw();
})();
