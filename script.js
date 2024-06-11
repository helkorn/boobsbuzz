const gridElement = document.getElementById('puzzle');
const foundWordElement = document.getElementById('found-word');
const hintButton = document.getElementById('hint-button');
const messageContainer = document.getElementById('message-container');
let timerElement = document.getElementById('timer');
let wrongClicks = 0;
let timerInterval;
let wordPositions = [];
let hintCount = 0;

hintButton.addEventListener('click', giveHint);

async function fetchWord() {
    const response = await fetch('melonit.csv');
    const text = await response.text();
    const words = text.split('\n').map(word => word.trim()).filter(word => word.length > 0);
    return words[Math.floor(Math.random() * words.length)];
}

async function fetchZoomData() {
    const response = await fetch('boobsmap.csv');
    const text = await response.text();
    const lines = text.split('\n').slice(1); // Skip the header
    const data = lines.map(line => {
        const [image_name, width, height, coord_x, coord_y, percent_x, percent_y] = line.split(',');
        return { image_name, percent_x: parseFloat(percent_x), percent_y: parseFloat(percent_y) };
    });
    return data;
}

async function createGrid() {
    const word = (await fetchWord());
    wordPositions = [];

    let grid = [];
    for (let i = 0; i < 6; i++) {
        grid[i] = [];
        for (let j = 0; j < 6; j++) {
            grid[i][j] = getRandomLetter();
        }
    }

    let startX = Math.floor(Math.random() * 6);
    let startY = Math.floor(Math.random() * 6);

    let directions = [[0, 1], [1, 0], [0, -1], [-1, 0]];
    let positions = [{ x: startX, y: startY }];
    grid[startY][startX] = word.charAt(0).toUpperCase();

    for (let i = 1; i < word.length; i++) {
        let lastPos = positions[positions.length - 1];
        let possibleDirections = directions.filter(dir => {
            let newX = lastPos.x + dir[0];
            let newY = lastPos.y + dir[1];
            return newX >= 0 && newX < 6 && newY >= 0 && newY < 6 && !positions.some(pos => pos.x === newX && pos.y === newY);
        });

        if (possibleDirections.length === 0) break;

        let dir = possibleDirections[Math.floor(Math.random() * possibleDirections.length)];
        let newX = lastPos.x + dir[0];
        let newY = lastPos.y + dir[1];

        grid[newY][newX] = word.charAt(i).toUpperCase();
        positions.push({ x: newX, y: newY });
    }

    wordPositions = positions;
    return { grid, word, positions, startX, startY };
}

async function initGame() {
    gridElement.innerHTML = '';
    foundWordElement.innerHTML = '';
    messageContainer.innerHTML = `
        <div id="link-container">
            <div id="hint-button" onclick="giveHint()">ANNA VINKKI</div>
            <div id="change-game-button"><a href="https://timosalonen.github.io/wordporn/">VAIHDA PELIÄ</a></div>
            <div id="timer">00:30</div>
        </div>
    `;
    hintButton.style.color = 'white';
    hintButton.style.cursor = 'pointer';
    const { grid, word, positions, startX, startY } = await createGrid();
    let foundLetters = 0;

    grid.forEach((row, rowIndex) => {
        row.forEach((letter, colIndex) => {
            const cell = document.createElement('div');
            cell.classList.add('grid-item');
            cell.innerHTML = `<span>${letter}</span>`;
            cell.dataset.letter = letter;
            cell.dataset.row = rowIndex;
            cell.dataset.col = colIndex;
            cell.addEventListener('click', () => handleCellClick(cell, word.toUpperCase(), positions));
            gridElement.appendChild(cell);
        });
    });

    const firstCell = [...gridElement.children].find(cell => 
        parseInt(cell.dataset.row) === startY && parseInt(cell.dataset.col) === startX
    );
    firstCell.classList.add('clicked');
    firstCell.dataset.found = true;
    foundLetters++;

    startTimer(word);
}

function handleCellClick(cell, word, positions) {
    const letter = cell.dataset.letter;
    const currentIndex = [...gridElement.children].filter(c => c.classList.contains('clicked')).length;

    if (cell.classList.contains('clicked')) {
        return;
    }

    const lastPos = positions[currentIndex - 1];
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    if (isAdjacent(lastPos, { x: col, y: row }) && letter === word[currentIndex].toUpperCase()) {
        cell.classList.add('clicked');
        if (currentIndex + 1 === word.length) {
            setTimeout(() => {
                animateFoundWord(word);
                setTimeout(() => {
                    showImage(word);
                }, 1000);
            }, 500);
        }
    } else {
        cell.classList.add('wrong');
        wrongClicks++;
        setTimeout(() => {
            cell.classList.remove('wrong');
        }, 300);
    }
}

function isAdjacent(pos1, pos2) {
    return (Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)) === 1;
}

function animateFoundWord(word) {
    const clickedCells = [...gridElement.children].filter(cell => cell.classList.contains('clicked'));
    clickedCells.forEach(cell => {
        cell.classList.add('flash');
    });

    setTimeout(() => {
        clickedCells.forEach((cell, index) => {
            cell.classList.add('move-up');
            cell.style.setProperty('--index', index);
            const letterSpan = document.createElement('span');
            letterSpan.textContent = cell.dataset.letter;
            foundWordElement.appendChild(letterSpan);
        });
        foundWordElement.style.visibility = 'visible';
    }, 600);
}

function startTimer(word) {
    let timeLeft = 30;
    timerElement = document.getElementById('timer');
    timerElement.textContent = `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--;
        timerElement.textContent = `00:${timeLeft < 10 ? '0' + timeLeft : timeLeft}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            flashGridAndRestart();
        }
    }, 1000);
}

function flashGridAndRestart() {
    gridElement.classList.add('flash-grid');
    setTimeout(() => {
        gridElement.classList.remove('flash-grid');
        initGame();
    }, 500);
}

function giveHint() {
    if (hintCount >= 3) {
        hintButton.style.color = 'gray';
        hintButton.style.cursor = 'not-allowed';
        return;
    }
    const currentIndex = [...gridElement.children].filter(c => c.classList.contains('clicked')).length;
    const nextPos = wordPositions[currentIndex];

    if (nextPos) {
        const nextCell = [...gridElement.children].find(cell => 
            parseInt(cell.dataset.row) === nextPos.y && parseInt(cell.dataset.col) === nextPos.x
        );
        nextCell.classList.add('clicked');
        nextCell.dataset.found = true;
        hintCount++;

        if (hintCount >= 3) {
            hintButton.style.color = 'gray';
            hintButton.style.cursor = 'not-allowed';
        }
    }
}

function getRandomLetter() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖ';
    return letters[Math.floor(Math.random() * letters.length)];
}

async function showImage(word) {
    const zoomData = await fetchZoomData();
    const imageZoom = zoomData.find(data => data.image_name.toLowerCase() === word.toLowerCase());
    const percentX = imageZoom ? imageZoom.percent_x : 50;
    const percentY = imageZoom ? imageZoom.percent_y : 50;

    document.body.innerHTML = `
        <div class="image-page">
            <div class="gray-borders left-border"></div>
            <div class="gray-borders right-border"></div>
            <div class="image-container">
                <div class="blur-background">
                    <img src="titpics/${word.toLowerCase()}.png">
                </div>
                <img id="mainImage" class="zoom-image" src="titpics/${word.toLowerCase()}.png" style="transform: translate(-${percentX}%, -${percentY}%);">
            </div>
            <div class="links-container">
                <a href="titpics.html">OSTA TÄMÄ PAITA</a>
                <div onclick="window.location.href='https://timosalonen.github.io/boobsbuzz/'">UUSI PELI</div>
            </div>
            <div class="zoom-coordinates">
                <p>X-Koordinaatti: ${percentX}%</p>
                <p>Y-Koordinaatti: ${percentY}%</p>
            </div>
        </div>
    `;

    const mainImage = document.getElementById('mainImage');

    // Start zoom animation
    setTimeout(() => {
        mainImage.style.animation = 'zoomIn 2.5s forwards';
    }, 1000); // Start after 1 second
}

initGame();
