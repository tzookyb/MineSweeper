'use strict'
var bgMusic = new Audio('audio/bg.mp3');
var gAnnounceTimeout;
var gAnnounce = document.querySelector('.announce');
var gFlashScreen = document.querySelector('.flash');
var gSmiley = document.querySelector('.smiley img');
var gModal = document.querySelector('.modal');
var gUndo;
var gEmptyCells;
var gBoard;
var gGameTimeInterval;
var gSelectedLevel = 1;
var gManualMines;
var gLevel = {
    SIZE: undefined,
    MINES: undefined
}
var gGame = {
    firstClick: true,
    isOn: false,
    isManual: false,
    shownCount: null,
    flaggedCount: null,
    time: 0,
    hints: 3,
    isHint: false,
    lives: 0,
    safeClicks: 3
}
function removeFlash() {
    gFlashScreen.classList.add('on');
    bgMusic.play();
    document.querySelector('.flash button').style.opacity = 0;
    setTimeout(function () { document.querySelector('.flash button').style.display = 'none' }, 3000);
}

function initGame(level) {
    //reset all game vars
    clearInterval(gGameTimeInterval);
    clearTimeout(gAnnounceTimeout);
    gAnnounce.style.color = '';
    gSmiley.src = 'img/scared.png';
    gAnnounce.classList.remove('gameover', 'victory');
    gFlashScreen.style.backgroundColor = 'transparent';
    gFlashScreen.classList.remove('on');
    gFlashScreen.style.display = 'none';
    gGame.firstClick = true;
    gGame.isOn = false;
    gGame.shownCount = 0;
    gGame.flaggedCount = 0;
    gGame.time = 0;
    gGame.hints = 3;
    gGame.isHint = false;
    gGame.safeClicks = 3;
    gLevel.SIZE = undefined;
    gLevel.MINES = undefined;

    if (level !== 4) say('Click anywhere on the minefield to start mine-sweeping', 3);

    switch (level) {
        case 1:
            gSelectedLevel = 1;
            gLevel.SIZE = 4;
            gLevel.MINES = 2;
            gGame.lives = 2;
            gGame.isManual = false;
            gBoard = (createMatrix(gLevel.SIZE));
            renderBoard();
            break;
        case 2:
            gSelectedLevel = 2;
            gLevel.SIZE = 8;
            gLevel.MINES = 12;
            gGame.lives = 3;
            gGame.isManual = false;
            gBoard = (createMatrix(gLevel.SIZE));
            renderBoard();
            break;
        case 3:
            gSelectedLevel = 3;
            gLevel.SIZE = 12;
            gLevel.MINES = 30;
            gGame.lives = 3;
            gGame.isManual = false;
            gBoard = (createMatrix(gLevel.SIZE));
            renderBoard();
            break;
        case 4:
            // Modal Implementation
            // SIZE
            // gModal.style.display = 'block';
            // gModal.innerHTML = `<label for="rows">How many rows would like to have in the board?<br/>
            // <input type="number" id="rows" placeholder="2 or bigger"><br/>
            // <button onclick="getInput("rows","gLevel.SIZE")>Continue</button>`;
            // MINES
            // gModal.innerHTML = `Enter how many mines would like to have on the board:<br/>
            // <input id="mines" placeholder="Between 1 and ${gLevel.SIZE ** 2 - 1}"<br/>
            // <button onclick="gLevelSIZE = document.getElementById("rows").value id="btn">Continue</button>`;

            gSelectedLevel = 4;
            while (isNaN(gLevel.SIZE) || gLevel.SIZE < 2) {
                gLevel.SIZE = parseInt(+prompt('Type in how many rows in the board?'));
            }
            while (isNaN(gLevel.MINES) || gLevel.MINES >= gLevel.SIZE ** 2 || gLevel.MINES < 1) {
                gLevel.MINES = parseInt(+prompt(`Type in how many mines on the board?
                Min of 1, Max of ${gLevel.SIZE ** 2 - 1}`));
            }
            gGame.lives = gLevel.MINES < 3 ? gLevel.MINES : 3;
            gGame.isManual = confirm('Do you want to place mines manually?');
            gBoard = (createMatrix(gLevel.SIZE, gGame.isManual ? true : false));
            renderBoard();
            gManualMines = gLevel.MINES;
            if (gGame.isManual) say(`click to place a mine. Remaining: ${gManualMines}`, 3);
            break;
    }
}

function getInput(id, variable) {
    console.log('doing');
    variable = document.getElementById(id);
    console.log(gLevel.SIZE);
};

function manualPlaceMines(cellI, cellJ, elCell) {
    if (gBoard[cellI][cellJ].isMine) {
        illegalClick(elCell);
        say('This spot is already mined', 1);
        return;
    }
    gBoard[cellI][cellJ].isMine = true;
    gManualMines--;
    renderBoard();
    if (gManualMines === 0) {
        for (var i = 0; i < gBoard.length; i++) {
            for (var j = 0; j < gBoard.length; j++) {
                gBoard[i][j].isShown = false;
            }
        }
        createBoard(undefined, undefined, 0)
        return;
    }
    say(`click to place the next mine. Remaining: ${gManualMines}`, 3);
}

function useHint() {
    if (!gGame.isOn) return;
    // cancel use of hint
    if (gGame.isHint) {
        gGame.isHint = false;
        renderBoard();
        return;
    }
    if (gGame.hints === 0) {
        say('Bummer, No more hints left...', 1);
        return;
    }
    if (gGame.hints > 0) {
        gGame.isHint = true;
        say('Click on board to show hint, click on the lamp to cancel', 2);
        renderBoard();
    }
}

function cellClicked(cellI, cellJ, elCell, userClick = false) {
    // first, if it's first click = create the board
    if (gGame.firstClick && !gGame.isManual) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        createBoard(cellI, cellJ, gLevel.MINES);
    }
    // if game is manual mode, go to place a mine.
    if (gGame.isManual && gManualMines !== 0) {
        manualPlaceMines(cellI, cellJ, elCell);
        return;
    }
    if (gGame.isManual) {
        gGame.isManual = false
        startTimer();
    }

    // if game is not on, do nothing.
    if (!gGame.isOn && userClick) {
        illegalClick(elCell);
        return;
    }

    // designate target cell
    var clickedCell = gBoard[cellI][cellJ];

    //if cell already shown, return
    if (clickedCell.isShown && userClick) {
        illegalClick(elCell);
        return;
    }

    if (gGame.isHint) {
        showHint(cellI, cellJ);
        return;
    }
    // for undo func. for each action the user does, the undo initializes, and pushes in all coordinates of changed cells.
    if (userClick) gUndo = [];
    var i = parseInt(cellI);
    var j = parseInt(cellJ);
    var currCell = { i, j };

    // check, if mine, then game over
    if (clickedCell.isMine) {
        gUndo.push(currCell);
        clickedCell.isMineExploded = true;
        gameOver(cellI, cellJ);
        return;
    }
    // if clicked on safe cell, show happy smiley.
    gSmiley.src = 'img/smiley.png';

    // if pressed on cell that has neighbours, show only it.
    if (clickedCell.minesAroundCount !== 0 && !clickedCell.isShown) {
        gUndo.push(currCell);
        if (userClick) new Audio('audio/click.mp3').play();
        clickedCell.isShown = true;
        gGame.shownCount++;
        handleSafeList(currCell, true);
        renderBoard();
        checkVictory();
        return
    }

    // if cell has no negs, mark it, and mark neighbour cells (not mines)
    // for each cell around that has no negs, run function again.
    // array 1 holds negs that are not mines.
    // array 2 holds cells that are empty, and not clicked yet. 
    if (!clickedCell.isShown) {
        if (userClick) new Audio('audio/click.mp3').play();
        gUndo.push(currCell);
        handleSafeList(currCell, true);
        clickedCell.isShown = true;
        gGame.shownCount++;
    }

    var negCells = (checkCellArea(cellI, cellJ));
    for (var i = 0; i < negCells[1].length; i++) {
        var coords = negCells[1][i];
        if (!gBoard[coords.i][coords.j].isShown) {
            gBoard[coords.i][coords.j].isShown = true;
            gGame.shownCount++;
            handleSafeList(coords, true);
            gUndo.push(coords);
        }
    }
    while (negCells[2].length > 0) {
        var currCell = negCells[2].pop();
        cellClicked(currCell.i, currCell.j);
    }
    renderBoard();
    checkVictory();
}

function illegalClick(elCell) {
    new Audio('audio/error.mp3').play();
    elCell.style.backgroundColor = 'lightcoral';
    setTimeout(function () {
        elCell.style.backgroundColor = '';
    }, 200)
}

function flagCell(cellI, cellJ, event, elCell) {
    event.preventDefault();
    // if game is not on, do nothing.
    if (!gGame.isOn) return;

    var cell = gBoard[cellI][cellJ];
    // if cell is already shown, then do not allow to flag.
    if (cell.isShown && !cell.isFlagged) {
        illegalClick(elCell);
        return;
    }
    // cell is not flagged
    if (!cell.isFlagged) {
        // if all flags used, do nothing.
        if (gGame.flaggedCount >= gLevel.MINES) {
            say('You have used all of your flags!', 2);
            return;
        }
        new Audio('audio/flag.mp3').play();
        cell.isFlagged = true;
        cell.isShown = true;
        gGame.flaggedCount++;
        gGame.shownCount++;
    } else { //cell is flagged
        cell.isFlagged = false;
        cell.isShown = false;
        gGame.flaggedCount--;
        gGame.shownCount--;
    }
    if (gGame.flaggedCount === gLevel.MINES) checkVictory();
    renderBoard()
}

function undoMove(undoArray) {
    if (!gUndo) return;
    if (!gGame.isOn && gGame.lives === 0) {
        say('You can only undo while you are still alive', 2);
        return;
    }
    if (gUndo.length === 0) return;
    for (var i = 0; i < undoArray.length; i++) {
        var currentItem = undoArray[i];
        gBoard[currentItem.i][currentItem.j].isShown = false;
        gGame.shownCount--;
        if (gBoard[currentItem.i][currentItem.j].isMine) {
            gBoard[currentItem.i][currentItem.j].isMineExploded = false;
            gLevel.MINES++;
            gGame.lives++;
            gBoard[currentItem.i][currentItem.j]
        } else {
            handleSafeList(currentItem, false);
        }
    }
    gUndo = [];
    renderBoard()
}

function showHint(cellI, cellJ) {
    gGame.isOn = false;
    var negs = checkCellArea(cellI, cellJ);
    revealOrHideNegs(negs, true);
    setTimeout(function () { revealOrHideNegs(negs, false) }, 1000);
}

function safeClick() {
    if (!gGame.isOn) return;
    if (gGame.safeClicks === 0) {
        say('Metal detector is out of battery!', 2);
        return;
    }
    new Audio('audio/safe.mp3').play();
    if (gEmptyCells.length === 0) {
        say('There are no more safe spots', 2);
        gGame.safeClicks--;
        renderBoard();
        return;
    }
    var safeCell = gEmptyCells[getRandomInt(0, gEmptyCells.length - 1)];
    var safeCellSelector = document.querySelector(`[data-id="${safeCell.i},${safeCell.j}"]`);
    safeCellSelector.classList.add('safe');
    say('The metal detector indicates that square is safe', 3)
    setTimeout(function () { safeCellSelector.classList.remove('safe'); renderBoard() }, 3000);
    gGame.safeClicks--;
}

function revealOrHideNegs(negs, show) {
    // debugger
    for (var i = 0; i < negs.length; i++) {
        for (var j = 0; j < negs[i].length; j++) {
            var coord = negs[i][j];
            var currCell = gBoard[coord.i][coord.j];
            if (!currCell.isFlagged && !currCell.isMineExploded) currCell.isShown = show;
            currCell.isHint = show;
        }
    }
    if (!show) {
        gGame.isOn = true;
        gGame.isHint = false;
        gGame.hints--;
    }
    renderBoard();
}

function checkVictory() {
    if (gGame.shownCount === gLevel.SIZE ** 2 && gGame.isOn && gGame.flaggedCount === gLevel.MINES) {
        new Audio('audio/victory.mp3').play();
        clearInterval(gGameTimeInterval);
        gGame.isOn = false;
        gAnnounce.classList.add('victory');
        say('Pheeew, you made it, alive!', 4);
        gSmiley.src = 'img/cool.png';
        setTimeout(function () { say(`Your time: ${gGame.time} seconds`, 4) }, 5000)
        renderBoard();
    }
}
function gameOver(cellI, cellJ) {
    new Audio('audio/gameover.mp3').play();
    gFlashScreen.style.display = 'block'
    gFlashScreen.classList.add('blast')
    setTimeout(function () {
        gFlashScreen.classList.remove('blast');
        gFlashScreen.style.display = 'none';
    }, 1000);
    gGame.lives--;
    gSmiley.src = 'img/angry.png';
    if (gGame.lives === 1) gSmiley.src = 'img/scared.png';
    if (gGame.lives !== 0) {
        gAnnounce.classList.add('gameover');
        setTimeout(function () { gAnnounce.classList.remove('gameover') }, 2000)
        say('You lost a life, watch out!', 2);
        gBoard[cellI][cellJ].isShown = true;
        gGame.shownCount++;
        gLevel.MINES--;
        checkVictory()
        renderBoard()
        return;
    }
    clearTimeout(gAnnounceTimeout);
    clearInterval(gGameTimeInterval);
    gGame.isOn = false;
    showMines();
    gAnnounce.classList.add('gameover');
    say('Oh No! You exploded to many tiny pieces!', 3);
    gSmiley.src = 'img/dead.png';
    gAnnounce.style.color = 'red';
    gAnnounceTimeout = setTimeout(function () { say('Game Over', 4) }, 3000);
    setTimeout(function () { say('To begin, choose game level', 10) }, 5000);
}
function showMines() {
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard.length; j++) {
            var cell = gBoard[i][j];
            if (cell.isMine) {
                cell.isShown = true;
            }
        }
    }
    renderBoard()
}

function handleSafeList(clickedCell, remove) {
    // gets a cell object, and compares is to the empty cells array created at startup. when found, remove that from list.
    // for undo purpose, if remove = false, returns that clicked cell to the emptycells array.
    if (!remove) {
        gEmptyCells.push(clickedCell);
        return
    }
    if (remove) {
        for (var arrayIdx = 0; arrayIdx < gEmptyCells.length; arrayIdx++) {
            var currCell = gEmptyCells[arrayIdx];
            if (currCell.i === clickedCell.i && currCell.j === clickedCell.j) {
                gEmptyCells.splice(arrayIdx, 1);
                return;
            }
        }
    }
}

function createBoard(cellI, cellJ, minesNum) {
    gGame.firstClick = false;
    gGame.isOn = true;

    gEmptyCells = []     //create array of all coords without the clicked one
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            if (i === cellI && j === cellJ && !gGame.isManual) continue;
            gEmptyCells.push({ i, j });
        }
    }

    //randomly place mines.
    while (minesNum > 0) {  //randomly draw a coord, and place mine in it
        var randomCell = gEmptyCells.splice([getRandomInt(0, gEmptyCells.length - 1)], 1);
        gBoard[randomCell[0].i][randomCell[0].j].isMine = true;
        minesNum--
    }

    if (gGame.isManual) {
        for (var i = 0; i < gEmptyCells.length; i++) {
            var currItem = gEmptyCells[i];
            if (gBoard[currItem.i][currItem.j].isMine) gEmptyCells.splice(i, 1);
        }
    }
    // check neighbours for all cells
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            gBoard[i][j].minesAroundCount = checkCellArea(i, j)[0].length;
        }
    }
    renderBoard();
    if (!gGame.isManual) {
        startTimer();
        say('Left-click to sweep cell, right-click to flag it', 3);
    }
    if (gGame.isManual) {
        say('Board is Ready', 2);
        setTimeout(function () { say('Left-click to sweep cell, right-click to flag it', 3); }, 2000);
    }
}