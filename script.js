let firstSelectedCell = null;
let isSwapping = false;

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
            cell.addEventListener('click', () => onCellClick(cell, row, col));
        }
    }

    return true;
};

// On DOM load, initialize the map
window.addEventListener('DOMContentLoaded', () => {
    window.renderMap(5, 5);
});

function onCellClick(cell, row, col) {
    if (!gameActive || isSwapping) return;

    if (!firstSelectedCell) {
        firstSelectedCell = { cell, row, col };
        cell.classList.add('selected');
        return;
    }

    const { cell: firstCell, row: r1, col: c1 } = firstSelectedCell;

    // Same cell clicked again — deselect
    if (r1 === row && c1 === col) {
        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    // Check if the second cell is a neighbor
    const isNeighbor =
        (Math.abs(r1 - row) === 1 && c1 === col) ||
        (Math.abs(c1 - col) === 1 && r1 === row);

    if (!isNeighbor) {
        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    // Swap logic
    isSwapping = true;
    swapCells(firstCell, cell);

    // Deselect
    firstCell.classList.remove('selected');
    firstSelectedCell = null;

    // Swap is async — allow it to complete
    setTimeout(() => {
        isSwapping = false;
    }, 300);
}

function swapCells(cellA, cellB) {
    if (!gameActive) return;

    const beingA = cellA.getAttribute('data-being');
    const beingB = cellB.getAttribute('data-being');
    const imgA = cellA.querySelector('img');
    const imgB = cellB.querySelector('img');

    // Swap beings and images
    cellA.setAttribute('data-being', beingB);
    cellB.setAttribute('data-being', beingA);
    cellA.innerHTML = '';
    cellB.innerHTML = '';
    if (imgB) cellA.appendChild(imgB);
    if (imgA) cellB.appendChild(imgA);

    // After swap, check for matches
    const matched = findMatches();

    if (matched.length > 0) {
        movesLeft--;
        document.getElementById('moves-value').textContent = movesLeft;
        clearMatches(matched);
    } else {
        // No match — revert the swap
        setTimeout(() => {
            cellA.setAttribute('data-being', beingA);
            cellB.setAttribute('data-being', beingB);
            cellA.innerHTML = '';
            cellB.innerHTML = '';
            if (imgA) cellA.appendChild(imgA);
            if (imgB) cellB.appendChild(imgB);
        }, 300);
    }
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
    matchedCells.forEach(cell => {
        const being = cell.getAttribute('data-being');
        if (being) {
            winProgress[being] = (winProgress[being] || 0) + 1;
            score += 10;
        }
        cell.innerHTML = '';
        cell.removeAttribute('data-being');
    });

    updateStatus();

    setTimeout(() => {
        refillMap();
        const newMatches = findMatches();
        if (newMatches.length > 0) {
            clearMatches(newMatches);
        } else {
            checkGameOver();
        }
    }, 300);
}

function refillMap() {
    const map = document.getElementById('map');
    const rows = map.rows;
    const rowCount = rows.length;
    const colCount = rows[0].cells.length;

    for (let row = 0; row < rowCount; row++) {
        for (let col = 0; col < colCount; col++) {
            const cell = rows[row].cells[col];
            if (!cell.hasAttribute('data-being')) {
                const creature = window.generateRandomBeingName();
                cell.setAttribute('data-being', creature);

                const img = document.createElement('img');
                img.src = `Images/${creature}.png`;
                img.setAttribute('data-coords', `x${col}_y${row}`);
                cell.appendChild(img);

                // Rebind click handler
                cell.addEventListener('click', () => onCellClick(cell, row, col));
            }
        }
    }
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