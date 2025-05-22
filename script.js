const clickSound = new Audio('SFX/click.wav');
const matchSound = new Audio('SFX/match.wav');

let firstSelectedCell = null;
let isSwapping = false;

let isCascading = false;
let isAnimating = false;
let hasPlayedMatchSound = false;
let hasPlayedMatchSoundThisCascade = false;

const creatureTypes = ['zouwu', 'swooping', 'salamander', 'puffskein', 'kelpie'];

window.generateRandomBeingName = function () {
    const index = Math.floor(Math.random() * creatureTypes.length);
    return creatureTypes[index];
};

// Clears the table
window.clearMap = function() {
    const map = document.getElementById('map');
    map.innerHTML = '';
};

// Creates an empty map grid (with classed cells)
window.renderMap = function(rowsCount, colsCount) {
    const map = document.getElementById('map');
    window.clearMap();

    for (let row = 0; row < rowsCount; row++) {
        const tr = document.createElement('tr');
        for (let col = 0; col < colsCount; col++) {
            const td = document.createElement('td');
            td.classList.add('cell');
            tr.appendChild(td);
        }
        map.appendChild(tr);
    }

    // Generate random creature grid and populate the map
    const creatureArray = Array.from({ length: rowsCount }, () =>
        Array.from({ length: colsCount }, () => generateRandomBeingName())
    );

    window.redrawMap(creatureArray);
};

// Draws creatures onto the map
window.redrawMap = function(creatureArray) {
    if (!Array.isArray(creatureArray) || creatureArray.length < 3 || !Array.isArray(creatureArray[0])) {
        return false;
    }

    const map = document.getElementById('map');
    const rows = map.rows;

    if (rows.length !== creatureArray.length || rows[0].cells.length !== creatureArray[0].length) {
        return false;
    }

    for (let row = 0; row < creatureArray.length; row++) {
        for (let col = 0; col < creatureArray[row].length; col++) {
            const cell = rows[row].cells[col];
            const creature = creatureArray[row][col];

            if (!creatureTypes.includes(creature)) {
                return false;
            }

            // Clear the cell first
            cell.innerHTML = '';
            cell.setAttribute('data-being', creature);

            const img = document.createElement('img');
            img.src = `Images/${creature}.png`;
            img.alt = creature;
            img.setAttribute('data-coords', `x${col}_y${row}`);

            cell.appendChild(img);
        }
    }

    return true;
};

// On DOM load, initialize the map
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('map').addEventListener('click', (e) => {
    const cell = e.target.closest('td.cell');
    if (!cell || !cell.parentElement || !cell.parentElement.parentElement) return;

    const row = cell.parentElement.rowIndex;
    const col = cell.cellIndex;

    onCellClick(cell, row, col);
});
});
function onCellClick(cell, row, col) {
    if (!gameActive || isSwapping || isAnimating) return; // <-- updated

    if (!firstSelectedCell) {
        firstSelectedCell = { cell, row, col };
        cell.classList.add('selected');
        clickSound.currentTime = 0;
        clickSound.play();
        return;
    }

    const { cell: firstCell, row: r1, col: c1 } = firstSelectedCell;

    if (r1 === row && c1 === col) {
        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    const isNeighbor =
        (Math.abs(r1 - row) === 1 && c1 === col) ||
        (Math.abs(c1 - col) === 1 && r1 === row);

    if (!isNeighbor) {
        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    isSwapping = true;
    isAnimating = true; // <-- prevent clicks
    swapCells(firstCell, cell);

    firstCell.classList.remove('selected');
    firstSelectedCell = null;
}

function swapCells(cellA, cellB) {
    if (!gameActive) return;

    const beingA = cellA.getAttribute('data-being');
    const beingB = cellB.getAttribute('data-being');
    const imgA = cellA.querySelector('img');
    const imgB = cellB.querySelector('img');

    // Determine direction
    const dx = cellB.cellIndex - cellA.cellIndex;
    const dy = cellB.parentElement.rowIndex - cellA.parentElement.rowIndex;

    const offsetX = dx * cellA.offsetWidth;
    const offsetY = dy * cellA.offsetHeight;

    // Apply transform to animate
    imgA.style.transition = 'transform 0.3s ease';
    imgB.style.transition = 'transform 0.3s ease';
    imgA.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    imgB.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;

    setTimeout(() => {
        // Reset transform styles
        imgA.style.transition = '';
        imgB.style.transition = '';
        imgA.style.transform = '';
        imgB.style.transform = '';

        // Swap images and data
        cellA.setAttribute('data-being', beingB);
        cellB.setAttribute('data-being', beingA);
        cellA.innerHTML = '';
        cellB.innerHTML = '';
        if (imgB) cellA.appendChild(imgB);
        if (imgA) cellB.appendChild(imgA);

        const matched = findMatches();

        if (matched.length > 0) {
            matchSound.pause();
            matchSound.currentTime = 0;
            matchSound.play().catch(e => console.warn('Match sound failed to play:', e));
            hasPlayedMatchSoundThisCascade = true;

            isCascading = true;
            movesLeft--;
            document.getElementById('moves-value').textContent = movesLeft;
            clearMatches(matched);
        } else {
            setTimeout(() => {
                // Revert if no match
                cellA.setAttribute('data-being', beingA);
                cellB.setAttribute('data-being', beingB);
                cellA.innerHTML = '';
                cellB.innerHTML = '';
                if (imgA) cellA.appendChild(imgA);
                if (imgB) cellB.appendChild(imgB);
                isSwapping = false;
                isAnimating = false;
            }, 300);
            return;
        }

        setTimeout(() => {
            isSwapping = false;
        }, 1000);
    }, 300);
}

function findMatches() {
    const map = document.getElementById('map');
    const matched = [];
    const rows = map.rows;
    const rowCount = rows.length;
    const colCount = rows[0].cells.length;

    // Check horizontal
    for (let row = 0; row < rowCount; row++) {
        let match = [rows[row].cells[0]];
        for (let col = 1; col < colCount; col++) {
            const curr = rows[row].cells[col];
            const prev = rows[row].cells[col - 1];
            if (curr.getAttribute('data-being') === prev.getAttribute('data-being')) {
                match.push(curr);
            } else {
                if (match.length >= 3) matched.push(...match);
                match = [curr];
            }
        }
        if (match.length >= 3) matched.push(...match);
    }

    // Check vertical
    for (let col = 0; col < colCount; col++) {
        let match = [rows[0].cells[col]];
        for (let row = 1; row < rowCount; row++) {
            const curr = rows[row].cells[col];
            const prev = rows[row - 1].cells[col];
            if (curr.getAttribute('data-being') === prev.getAttribute('data-being')) {
                match.push(curr);
            } else {
                if (match.length >= 3) matched.push(...match);
                match = [curr];
            }
        }
        if (match.length >= 3) matched.push(...match);
    }

    return [...new Set(matched)];
}

function clearMatches(matchedCells) {
    if (matchedCells.length === 0) {
        isCascading = false;
        hasPlayedMatchSoundThisCascade = false; // Reset for next cascade
        return;
    }

    if (!isCascading) {
        isCascading = true;
        hasPlayedMatchSoundThisCascade = false; // Start of new cascade
    }

            matchedCells.forEach(cell => {
            const being = cell.getAttribute('data-being');
            if (being) {
                winProgress[being] = (winProgress[being] || 0) + 1;
                score += 10;
            }

            const img = cell.querySelector('img');
            if (!img) return;

            let frame = 0;
            const frameCount = 7;
            const frameDuration = 800 / frameCount;

            const animation = () => {
                if (frame >= frameCount) {
                    cell.innerHTML = '';
                    cell.removeAttribute('data-being');
                    return;
                }

                img.src = `Animation Frames/frame_${frame}_delay-0.07s.png`;
                frame++;
                setTimeout(animation, frameDuration);
            };

            animation(); // start animation
        });

    updateStatus();

    setTimeout(() => {
        refillMap(() => {
            const newMatches = findMatches();
            if (newMatches.length > 0) {
                clearMatches(newMatches); // 👈 no need to pass a flag
            } else {
                isCascading = false;
                hasPlayedMatchSoundThisCascade = false; // ✅ Reset again
                isAnimating = false;
                checkGameOver();
            }
        });
    }, 820);
}

function refillMap(callback) {
    const map = document.getElementById('map');
    const rows = map.rows;
    const rowCount = rows.length;
    const colCount = rows[0].cells.length;

    for (let row = rowCount - 1; row >= 0; row--) {
        for (let col = 0; col < colCount; col++) {
            const cell = rows[row].cells[col];
            if (!cell.hasAttribute('data-being')) {
                // Look above for a non-empty cell
                let found = false;
                for (let k = row - 1; k >= 0; k--) {
                    const upperCell = rows[k].cells[col];
                    if (upperCell.hasAttribute('data-being')) {
                        const being = upperCell.getAttribute('data-being');
                        const img = upperCell.querySelector('img');

                        cell.setAttribute('data-being', being);
                        cell.innerHTML = '';
                        if (img) {
                            const clone = img.cloneNode();
                            clone.classList.add('falling');
                            cell.appendChild(clone);
                        }

                        upperCell.removeAttribute('data-being');
                        upperCell.innerHTML = '';
                        found = true;
                        break;
                    }
                }

                // If no upper cells, spawn new
                if (!found) {
                    const creature = window.generateRandomBeingName();
                    cell.setAttribute('data-being', creature);
                    cell.innerHTML = '';

                    const img = document.createElement('img');
                    img.src = `Images/${creature}.png`;
                    img.setAttribute('data-coords', `x${col}_y${row}`);
                    img.classList.add('falling');
                    cell.appendChild(img);
                }
            }
        }
    }

    // Let DOM update visually
    setTimeout(() => {
        if (typeof callback === 'function') callback();
    }, 100);
}

let movesLeft = 15;
let score = 0;
let gameActive = true;

const winTarget = {};
const winProgress = {};

function updateStatus() {
    document.getElementById('score-value').textContent = score;
    for (const being in winTarget) {
        const targetSpan = document.querySelector(`.target-count[data-being="${being}"]`);
        if (targetSpan) {
            const collected = winProgress[being] || 0;
            targetSpan.textContent = `${winTarget[being]} (${collected})`;
        }
    }
}

function checkGameOver() {
    const footer = document.getElementById('game-footer');

    const hasWon = Object.entries(winTarget).every(([being, required]) => {
        return (winProgress[being] || 0) >= required;
    });

    if (hasWon) {
        footer.textContent = "You won! Reload the page to start the game again.";
        gameActive = false;
    } else if (movesLeft <= 0) {
        footer.textContent = "You lost! Reload the page to start the game again.";
        gameActive = false;
    }
}

function generateWinConditions() {
    const targetCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 creatures
    const selected = [];

    while (selected.length < targetCount) {
        const creature = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
        if (!selected.includes(creature)) {
            selected.push(creature);
        }
    }

    selected.forEach(creature => {
        const count = Math.floor(Math.random() * 6) + 5; // Between 5 and 10
        winTarget[creature] = count;
        winProgress[creature] = 0;
    });

    updateWinUI();
}

function updateWinUI() {
    const container = document.getElementById('beings-for-win');
    container.innerHTML = '';

    for (const being in winTarget) {
        const img = document.createElement('img');
        img.src = `Images/${being}.png`;
        img.alt = being;

        const span = document.createElement('span');
        span.className = 'target-count';
        span.setAttribute('data-being', being);
        span.textContent = winTarget[being];

        container.appendChild(img);
        container.appendChild(span);
    }
}

window.onload = function () {
    generateWinConditions();
    window.renderMap(5, 5);
};