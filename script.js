const clickSound = new Audio('SFX/click.wav');
const matchSound = new Audio('SFX/match.wav');

let firstSelectedCell = null;
let isSwapping = false;
let isCascading = false;
let isAnimating = false;
let hasPlayedMatchSound = false;
let hasPlayedMatchSoundThisCascade = false;

const creatureTypes = ['zouwu', 'swooping', 'salamander', 'puffskein', 'kelpie'];

let movesLeft = 15;
let score = 0;
let gameActive = true;

const winTarget = {};
const winProgress = {};

window.generateRandomBeingName = function () {
    const index = Math.floor(Math.random() * creatureTypes.length);
    return creatureTypes[index];
};

window.clearMap = function () {
    const map = document.getElementById('map');
    map.innerHTML = '';
};

window.renderMap = function (rowsCount, colsCount) {
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

    const creatureArray = Array.from({ length: rowsCount }, () =>
        Array.from({ length: colsCount }, () => generateRandomBeingName())
    );

    window.redrawMap(creatureArray);
};

window.redrawMap = function (creatureArray) {
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

            cell.innerHTML = '';
            cell.setAttribute('data-being', creature);

            const img = document.createElement('img');
            img.src = `Images/${creature}.png`;
            img.alt = creature;
            img.setAttribute('data-coords', `x${col}_y${row}`);
            img.onerror = () => {
                img.src = 'Images/fallback.png';
            };

            cell.appendChild(img);
        }
    }

    return true;
};

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
    if (!gameActive || isSwapping || isAnimating) return;

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
    isAnimating = true;

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

    const dx = cellB.cellIndex - cellA.cellIndex;
    const dy = cellB.parentElement.rowIndex - cellA.parentElement.rowIndex;
    const offsetX = dx * cellA.offsetWidth;
    const offsetY = dy * cellA.offsetHeight;

    // Animate the images
    imgA.style.transition = 'transform 0.3s ease';
    imgB.style.transition = 'transform 0.3s ease';
    imgA.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    imgB.style.transform = `translate(${-offsetX}px, ${-offsetY}px)`;

    isSwapping = true;
    isAnimating = true;

    setTimeout(() => {
        // 1. Swap data-being
        cellA.setAttribute('data-being', beingB);
        cellB.setAttribute('data-being', beingA);

        // 2. Re-query images after DOM update
        const updatedImgA = cellA.querySelector('img');
        const updatedImgB = cellB.querySelector('img');

        if (updatedImgA) updatedImgA.src = `Images/${beingB}.png`;
        if (updatedImgB) updatedImgB.src = `Images/${beingA}.png`;

        // Reset styles
        if (updatedImgA) {
            updatedImgA.style.transition = '';
            updatedImgA.style.transform = '';
        }
        if (updatedImgB) {
            updatedImgB.style.transition = '';
            updatedImgB.style.transform = '';
        }

        const matched = findMatches();

        if (matched.length > 0) {
            matchSound.pause();
            matchSound.currentTime = 0;
            matchSound.play().catch(e => console.warn('Match sound failed to play:', e));
            hasPlayedMatchSoundThisCascade = true;

            isCascading = true;
            movesLeft--;
            document.getElementById('moves-value').textContent = movesLeft;

            setTimeout(() => clearMatches(matched), 50);
        } else {
            // Revert swap
            setTimeout(() => {
                cellA.setAttribute('data-being', beingA);
                cellB.setAttribute('data-being', beingB);

                const revertImgA = cellA.querySelector('img');
                const revertImgB = cellB.querySelector('img');

                if (revertImgA) {
                    revertImgA.src = `Creatures/${beingA}.png`;
                    revertImgA.style.transition = 'transform 0.3s ease';
                    revertImgA.style.transform = 'translate(0px, 0px)';
                }

                if (revertImgB) {
                    revertImgB.src = `Creatures/${beingB}.png`;
                    revertImgB.style.transition = 'transform 0.3s ease';
                    revertImgB.style.transform = 'translate(0px, 0px)';
                }

                setTimeout(() => {
                    if (revertImgA) {
                        revertImgA.style.transition = '';
                        revertImgA.style.transform = '';
                    }
                    if (revertImgB) {
                        revertImgB.style.transition = '';
                        revertImgB.style.transform = '';
                    }

                    isSwapping = false;
                    isAnimating = false;
                    movesLeft--;
                    document.getElementById('moves-value').textContent = movesLeft;
                }, 300);
            }, 50);
        }
    }, 300);
}


function findMatches() {
    const map = document.getElementById('map');
    const matched = [];
    const rows = map.rows;
    const rowCount = rows.length;
    const colCount = rows[0].cells.length;

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

    matched.forEach(cell => {
        cell.setAttribute('data-matched', 'true');
    });

    return [...new Set(matched)];
}

function playMatchSound() {
    if (!matchSound.paused && !matchSound.ended) return; // already playing

    matchSound.currentTime = 0;
    matchSound.play().catch(e => console.warn('Match sound failed to play:', e));
}

function clearMatches(matchedCells) {
    if (matchedCells.length === 0) {
        isCascading = false;
        hasPlayedMatchSoundThisCascade = false;
        isAnimating = false;
        return;
    }

    // Play once per match/cascade level
    if (!hasPlayedMatchSoundThisCascade) {
        playMatchSound();
        hasPlayedMatchSoundThisCascade = true;
    }

    if (!isCascading) {
        isCascading = true;
    }

    matchedCells.forEach(cell => {
        const img = cell.querySelector('img');
        if (!img || !cell.hasAttribute('data-being')) return;

        const being = cell.getAttribute('data-being');
        winProgress[being] = (winProgress[being] || 0) + 1;
        score += 10;

        let frame = 0;
        const frameCount = 7;
        const frameDuration = 800 / frameCount;

        const animateFrame = () => {
            if (!document.body.contains(img)) return;
            if (frame >= frameCount) {
                cell.innerHTML = '';
                cell.removeAttribute('data-being');
                return;
            }
            img.src = `Animation Frames/frame_${frame}_delay-0.07s.png`;
            frame++;
            setTimeout(animateFrame, frameDuration);
        };

        animateFrame();
    });

    updateStatus();

    setTimeout(() => {
        refillMap(() => {
            setTimeout(() => {
                const newMatches = findMatches();
                if (newMatches.length > 0) {
                    hasPlayedMatchSoundThisCascade = false; // allow sound next match in cascade
                    clearMatches(newMatches);
                } else {
                    isCascading = false;
                    hasPlayedMatchSoundThisCascade = false;
                    isAnimating = false;
                    isSwapping = false;
                    checkGameOver();
                }
            }, 150);
        });
    }, 800);
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

                if (!found) {
                    const creature = window.generateRandomBeingName();
                    cell.setAttribute('data-being', creature);
                    cell.innerHTML = '';

                    const img = document.createElement('img');
                    img.src = `Images/${creature}.png`;
                    img.setAttribute('data-coords', `x${col}_y${row}`);
                    img.classList.add('falling');
                    img.onerror = () => {
                        img.src = 'Images/fallback.png';
                    };

                    cell.appendChild(img);
                }
            }
        }
    }

    setTimeout(() => {
        if (typeof callback === 'function') callback();
    }, 100);
}

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
    const targetCount = Math.floor(Math.random() * 2) + 1;
    const selected = [];

    while (selected.length < targetCount) {
        const creature = creatureTypes[Math.floor(Math.random() * creatureTypes.length)];
        if (!selected.includes(creature)) {
            selected.push(creature);
        }
    }

    selected.forEach(creature => {
        const count = Math.floor(Math.random() * 6) + 5;
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