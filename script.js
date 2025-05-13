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
    if (isSwapping) return;

    if (!firstSelectedCell) {
        firstSelectedCell = { cell, row, col };
        cell.classList.add('selected');
        return;
    }

    const { cell: firstCell, row: r1, col: c1 } = firstSelectedCell;

    // Same cell click: deselect
    if (r1 === row && c1 === col) {
        cell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    // Check if the second click is a valid neighbor
    const isNeighbor =
        (Math.abs(r1 - row) === 1 && c1 === col) ||
        (Math.abs(c1 - col) === 1 && r1 === row);

    if (!isNeighbor) {
        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        return;
    }

    isSwapping = true;

    swapCells(firstCell, cell);

    // Check for match
    setTimeout(() => {
        const matched = findMatches();
        if (matched.length > 0) {
            clearMatches(matched);
        } else {
            // No match — revert
            swapCells(firstCell, cell);
        }

        firstCell.classList.remove('selected');
        firstSelectedCell = null;
        isSwapping = false;
    }, 300);
}

function swapCells(cellA, cellB) {
    const beingA = cellA.getAttribute('data-being');
    const beingB = cellB.getAttribute('data-being');

    const imgA = cellA.querySelector('img');
    const imgB = cellB.querySelector('img');

    // Swap being
    cellA.setAttribute('data-being', beingB);
    cellB.setAttribute('data-being', beingA);

    // Swap images
    cellA.innerHTML = '';
    cellB.innerHTML = '';
    cellA.appendChild(imgB);
    cellB.appendChild(imgA);
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
        cell.innerHTML = '';
        cell.removeAttribute('data-being');
    });

    setTimeout(() => {
        refillMap();

        // Check again for new matches (chain reaction)
        const newMatches = findMatches();
        if (newMatches.length > 0) {
            clearMatches(newMatches); // Recurse!
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