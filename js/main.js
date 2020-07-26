'use strict'
var bgMusic = new Audio('audio/bg.mp3');
var gMsgTimeout;
var gElMsg = document.querySelector('.msg');
var gElFlashScreen = document.querySelector('.flash');
var gElSmiley = document.querySelector('.smiley img');
var gUndo;
var gEmptyCells;
var gBoard;
var gGameTimeInterval;
var gSelectedLevel = 1;
var gManualMines;
var gGame;
var gLevel;

function hideFlash() {
    gElFlashScreen.classList.add('on');
    bgMusic.play();
    document.querySelector('.flash button').style.opacity = 0;
    setTimeout(function () {
        document.querySelector('.flash button').style.display = 'none'
        gElFlashScreen.style.display = 'none';
    }, 5000);
}

function initGame(level) {
    //reset all game vars
    clearInterval(gGameTimeInterval);
    clearTimeout(gMsgTimeout);
    gElMsg.style.color = '';
    gElSmiley.src = 'img/scared.png';
    gElMsg.classList.remove('gameover', 'victory');
    gLevel = { SIZE: 0, MINES: 0 };
    gGame = {
        firstClick: true,
        isOn: false,
        isManual: false,
        shownCount: 0,
        flaggedCount: 0,
        time: 0,
        hintsLeft: 3,
        isHintMode: false,
        livesLeft: 0,
        safeClicks: 3
    }

    if (level !== 4) {
        gGame.isManual = false;
        renderMsg('Click anywhere on the minefield to start mine-sweeping', 3);
    }
    switch (level) {
        case 1:
            gSelectedLevel = 1;
            gLevel = { SIZE: 4, MINES: 2 };
            gGame.livesLeft = 2;
            break;
        case 2:
            gSelectedLevel = 2;
            gLevel = { SIZE: 8, MINES: 12 };
            gGame.livesLeft = 3;
            break;
        case 3:
            gSelectedLevel = 3;
            gLevel = { SIZE: 12, MINES: 30 };
            gGame.livesLeft = 3;
            break;
        case 4:
            gSelectedLevel = 4;
            while (isNaN(gLevel.SIZE) || gLevel.SIZE < 2) {
                gLevel.SIZE = parseInt(+prompt('Type in how many rows in the board?'));
            }
            while (isNaN(gLevel.MINES) || gLevel.MINES >= gLevel.SIZE ** 2 || gLevel.MINES < 1) {
                gLevel.MINES = parseInt(+prompt(`Type in how many mines on the board?
                Min of 1, Max of ${gLevel.SIZE ** 2 - 1}`));
            }
            gGame.livesLeft = gLevel.MINES < 3 ? gLevel.MINES : 3;
            gGame.isManual = confirm('Place mines manually? click cancel for random');

            gManualMines = gLevel.MINES;
            if (gGame.isManual) renderMsg(`click to place a mine. Remaining: ${gManualMines}`, 3);
            break;
    }
    gBoard = (initBoard(gLevel.SIZE, gGame.isManual ? true : false));
    renderBoard();
    renderGameStats();
}

function getInput(id, variable) {
    console.log('doing');
    variable = document.getElementById(id);
    console.log(gLevel.SIZE);
};

function manualPlaceMines(cellI, cellJ, elCell) {
    if (gBoard[cellI][cellJ].isMine) {
        illegalClick(true, elCell);
        renderMsg('This spot is already mined', 1);
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
        startGame(undefined, undefined, 0)
        return;
    }
    renderMsg(`click to place the next mine. Remaining: ${gManualMines}`, 3);
}

function useHint() {
    if (!gGame.isOn) return;

    if (!gGame.hintsLeft) {
        illegalClick(false);
        renderMsg('Bummer, No more hints left...', 1);
        return;
    }
    // cancel use of hint
    if (gGame.isHintMode) {
        gGame.isHintMode = false;
    } else {
        gGame.isHintMode = true;
        renderMsg('Click on board to show hint, click on the lamp to cancel', 2);
    }
    renderGameStats();
}

function cellClicked(cellI, cellJ, elCell, userClick = false) {
    var clickSound = new Audio('audio/click.mp3');
    // if game is manual mode, go to place a mine.
    if (gGame.isManual && gManualMines !== 0) {
        manualPlaceMines(cellI, cellJ, elCell);
        return;
    }
    // first, if it's first click = create the board
    if (gGame.firstClick && !gGame.isManual) {
        startGame(cellI, cellJ, gLevel.MINES);
    }
    if (gGame.isManual) {
        gGame.isManual = false
        startTimer();
    }

    // if game is not on, do nothing.
    if (!gGame.isOn && userClick) {
        illegalClick(true, elCell);
        return;
    }

    // designate target cell
    var clickedCell = gBoard[cellI][cellJ];

    //if cell already shown, return
    if (clickedCell.isShown && userClick) {
        illegalClick(true, elCell);
        return;
    }

    if (gGame.isHintMode) {
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
    gElSmiley.src = 'img/smiley.png';

    // if pressed on cell that has neighbours, show only it.
    if (clickedCell.minesAroundCount !== 0 && !clickedCell.isShown) {
        gUndo.push(currCell);
        if (userClick) clickSound.play();
        clickedCell.isShown = true;
        gGame.shownCount++;
        handleSafeList(currCell, true);
        renderBoard();
        renderGameStats();
        checkVictory();
        return;
    }

    // if cell has no negs, mark it, and mark neighbour cells (not mines)
    // for each cell around that has no negs, run function again.
    // array 1 holds negs that are not mines.
    // array 2 holds cells that are empty, and not clicked yet. 
    if (!clickedCell.isShown) {
        if (userClick) clickSound.play();
        gUndo.push(currCell);
        handleSafeList(currCell, true);
        clickedCell.isShown = true;
        gGame.shownCount++;
    }

    var negCells = (checkCellArea(cellI, cellJ));
    for (var i = 0; i < negCells.numberedCells.length; i++) {
        var coords = negCells.numberedCells[i];
        if (!gBoard[coords.i][coords.j].isShown) {
            gBoard[coords.i][coords.j].isShown = true;
            gGame.shownCount++;
            handleSafeList(coords, true);
            gUndo.push(coords);
        }
    }
    while (negCells.emptyCells.length) {
        var currCell = negCells.emptyCells.pop();
        cellClicked(currCell.i, currCell.j);
    }
    renderBoard();
    renderGameStats();
    checkVictory();
}

function illegalClick(isBoardClick = true, elCell) {
    new Audio('audio/error.mp3').play();
    if (isBoardClick) {
        elCell.style.backgroundColor = 'lightcoral';
        setTimeout(function () {
            elCell.style.backgroundColor = '';
        }, 200)
    }
}

function flagCell(cellI, cellJ, event, elCell) {
    event.preventDefault();
    // if game is not on, do nothing.
    if (!gGame.isOn) return;

    var cell = gBoard[cellI][cellJ];
    // if cell is already shown, then do not allow to flag.
    if (cell.isShown && !cell.isFlagged) {
        illegalClick(true, elCell);
        return;
    }
    // cell is not flagged
    if (!cell.isFlagged) {
        // if all flags used, do nothing.
        if (gGame.flaggedCount >= gLevel.MINES) {
            renderMsg('You have used all of your flags!', 2);
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
    renderBoard();
    renderGameStats();
}

function undoMove() {
    if (!gUndo.length) return;
    if (!gGame.isOn && gGame.livesLeft === 0) {
        renderMsg('You can only undo while you are still alive', 2);
        return;
    }
    for (var i = 0; i < gUndo.length; i++) {
        var currCoords = gUndo[i];
        var currCell = gBoard[currCoords.i][currCoords.j];
        currCell.isShown = false;
        gGame.shownCount--;
        if (currCell.isMine) {
            currCell.isMineExploded = false;
            gLevel.MINES++;
            gGame.livesLeft++;
        } else {
            handleSafeList(currCoords, false);
        }
    }
    gUndo = [];
    renderBoard();
    renderGameStats();
}

function showHint(cellI, cellJ) {
    var negs = checkCellArea(cellI, cellJ);
    revealOrHideNegs(negs, true);
    setTimeout(function () { revealOrHideNegs(negs, false) }, 1000);
}

function safeClick() {
    if (!gGame.isOn) return;
    if (gGame.safeClicks === 0) {
        illegalClick(false);
        renderMsg('Metal detector is out of battery!', 2);
        return;
    }
    new Audio('audio/safe.mp3').play();
    if (gEmptyCells.length === 0) {
        renderMsg('There are no more safe spots', 2);
        gGame.safeClicks--;
        renderBoard();
        renderGameStats();
        return;
    }
    var safeCell = gEmptyCells[getRandomInt(0, gEmptyCells.length - 1)];
    var safeCellSelector = document.querySelector(`[data-id="${safeCell.i},${safeCell.j}"]`);
    safeCellSelector.classList.add('safe');
    renderMsg('The metal detector indicates that square is safe', 3)
    setTimeout(function () {
        safeCellSelector.classList.remove('safe');
        renderBoard();
    }, 3000);
    gGame.safeClicks--;
    renderGameStats();
}

function revealOrHideNegs(negs, show) {
    for (var group in negs) {
        var currentGroup = negs[group];
        for (var i = 0; i < currentGroup.length; i++) {
            var coord = currentGroup[i];
            var currCell = gBoard[coord.i][coord.j];
            if (!currCell.isFlagged && !currCell.isMineExploded) currCell.isShown = show;
            currCell.isHint = show;
        }
    }
    if (!show) {
        gGame.isOn = true;
        gGame.isHintMode = false;
        gGame.hintsLeft--;
        renderGameStats();
    } else gGame.isOn = false;
    renderBoard();
}

function checkVictory() {
    if (gGame.shownCount === gLevel.SIZE ** 2 && gGame.isOn && gGame.flaggedCount === gLevel.MINES) {
        new Audio('audio/victory.mp3').play();
        clearInterval(gGameTimeInterval);
        gGame.isOn = false;
        gUndo = [];
        gElMsg.classList.add('victory');
        renderMsg('Pheeew, you made it, alive!', 4);
        gElSmiley.src = 'img/cool.png';
        setTimeout(function () { renderMsg(`Your time: ${gGame.time} seconds`, 4) }, 5000)
        renderBoard();
    }
}

function gameOver(cellI, cellJ) {
    new Audio('audio/gameover.mp3').play();
    gElFlashScreen.style.display = 'block'
    gElFlashScreen.classList.add('blast')
    setTimeout(function () {
        gElFlashScreen.classList.remove('blast');
        gElFlashScreen.style.display = 'none';
    }, 1000);

    gGame.livesLeft--;
    gElSmiley.src = 'img/angry.png';
    if (gGame.livesLeft === 1) {
        setTimeout(function () { if (gGame.isOn) gElSmiley.src = 'img/scared.png' }, 1000);
    }
    if (gGame.livesLeft) {
        gElMsg.classList.add('gameover');
        renderMsg('You lost a life, watch out!', 2);
        setTimeout(function () { gElMsg.classList.remove('gameover') }, 2000);
        gBoard[cellI][cellJ].isShown = true;
        gGame.shownCount++;
        gLevel.MINES--;
        checkVictory();
        renderGameStats();
        renderBoard();
        return;
    }
    clearTimeout(gMsgTimeout);
    clearInterval(gGameTimeInterval);
    gGame.isOn = false;
    renderGameStats();
    showMines();
    gElMsg.classList.add('gameover');
    renderMsg('Oh No! You exploded to many tiny pieces!', 3);
    gElSmiley.src = 'img/dead.png';
    gElMsg.style.color = 'red';
    gMsgTimeout = setTimeout(function () { renderMsg('Game Over', 4) }, 3000);
    setTimeout(function () { renderMsg('To begin, choose game level', 10) }, 5000);
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
    renderBoard();
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

function startGame(cellI, cellJ, minesNum) {
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
        minesNum--;
    }
    
    //if mines were placed manually, this takes them off the empty list for safe click feature
    if (gGame.isManual) {
        for (var i = 0; i < gEmptyCells.length; i++) {
            var currItem = gEmptyCells[i];
            if (gBoard[currItem.i][currItem.j].isMine) gEmptyCells.splice(i, 1);
        }
    }
    
    // check neighbours for all cells
    for (var i = 0; i < gBoard.length; i++) {
        for (var j = 0; j < gBoard[0].length; j++) {
            gBoard[i][j].minesAroundCount = checkCellArea(i, j).minesAround.length;
        }
    }
    renderBoard();
    if (!gGame.isManual) {
        startTimer();
        renderMsg('Left-click to sweep cell, right-click to flag it', 3);
    }
    if (gGame.isManual) {
        renderMsg('Board is Ready', 2);
        setTimeout(function () { renderMsg('Left-click to sweep cell, right-click to flag it', 3); }, 2000);
    }
}