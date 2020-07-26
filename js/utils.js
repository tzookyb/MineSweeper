'use strict'

function renderMsg(phrase, secsCount) {
    clearInterval(gMsgTimeout);
    gElMsg.innerText = phrase
    gElMsg.style.visibility = 'visible';
    gMsgTimeout = setTimeout(function () { gElMsg.style.visibility = 'hidden' }, secsCount * 1000)
}

function initBoard(size, isManual = false) {
    var matrix = []
    for (var i = 0; i < size; i++) {
        var row = []
        for (var j = 0; j < size; j++) {
            var cell = {
                i: i,
                j: j,
                minesAroundCount: null,
                isShown: isManual ? true : false,
                isMine: false,
                isMineExploded: false,
                isFlagged: false,
                isHint: false
            }
            row.push(cell)
        }
        matrix.push(row)
    }
    return matrix
}

//renders the board to <tbody>
function renderBoard() {
    var htmlStr = '';
    for (var i = 0; i < gBoard.length; i++) {
        htmlStr += `<tr>\n`;
        for (var j = 0; j < gBoard[0].length; j++) {
            var currCell = gBoard[i][j];
            var currCellContent = '';
            var currCellClass = '';

            // assign cell HTML content and class:
            currCellClass = (currCell.isShown) ? ' show-cell' : '';
            currCellClass += (currCell.isHint) ? ' hinted-cell' : '';
            if (currCell.isFlagged && gGame.isOn || currCell.isFlagged && gGame.isHintMode && !currCell.isHint) currCellContent = `<img src="img/flag.ico"/>`;
            else if (currCell.isMine) {
                currCellContent = `<img style="display:block" width="100%" height="100%" src="img/mine.ico"/>`;
                if (currCell.isMineExploded) currCellClass += ' lose';
                if (currCell.isFlagged) currCellContent = `<img style="display:block" width="100%" height="100%" src="img/det_mine.ico"/>`;
            } else if (currCell.minesAroundCount) {
                currCellContent = currCell.minesAroundCount;
                if (currCellContent === 1) currCellClass += ' one';
                else if (currCellContent === 2) currCellClass += ' two';
                else if (currCellContent === 3) currCellClass += ' three';
                else if (currCellContent >= 4) currCellClass += ' four';
            }
            // build the html string for the cell
            htmlStr += `<td class="cell${currCellClass}" data-id="${i},${j}" oncontextmenu="flagCell(${i},${j},event,this)" onclick="cellClicked(${i},${j},this,true)">`
            //enclose within div that hides the cell content
            htmlStr += currCell.isShown ? '' : `<div class="hide-cell">`;
            htmlStr += currCellContent;
            htmlStr += `</div></td>\n`
        }
        htmlStr += `</tr>\n`
    }
    document.querySelector('tbody').innerHTML = htmlStr;
}
function renderGameStats() {
    // lives rendering
    document.querySelector('.lives').innerHTML = 'Lives Remaining:<br /><span></span>';
    var elLives = document.querySelector('.lives span');
    elLives.innerHTML = '';
    elLives.innerHTML += (`<img width="50px" height="50px" src="img/heart.png"/>`).repeat(gGame.livesLeft);
    elLives.innerHTML += (`<img width="50px" height="50px" src="img/noheart.png"/>`).repeat(3 - gGame.livesLeft);

    // hints rendering
    var elHint = document.querySelector('.hint img');
    var elHintCounter = document.querySelector('.hintcounter');
    if (gGame.hintsLeft < 1) elHint.src = 'img/nohint.png';
    else if (gGame.isHintMode) elHint.src = 'img/hinton.png';
    else elHint.src = 'img/hintoff.png';
    elHintCounter.innerText = gGame.hintsLeft;

    // flags remaining
    var flagCounter = document.querySelector('.flagcounter');
    if (gGame.isOn) {
        flagCounter.innerText = `Mines to be flagged: ${gLevel.MINES - gGame.flaggedCount}`;
    } else flagCounter.innerText = '';

    // safeclick counter
    document.querySelector('.safecounter').innerText = gGame.safeClicks;
}

// returns random numbers
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function checkCellArea(cellI, cellJ) {
    var areaOfCell = {
        currentCell: [],
        minesAround: [],
        numberedCells: [],
        emptyCells: []
    };
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            if (j < 0 || j >= gBoard[i].length) continue;

            if (i === cellI && j === cellJ) {
                areaOfCell.currentCell.push({ i, j });
                continue;
            }

            var currCell = gBoard[i][j];
            if (currCell.isMine) areaOfCell.minesAround.push({ i, j });
            if (!currCell.isShown) {
                (currCell.minesAroundCount) ? areaOfCell.numberedCells.push({ i, j }) : areaOfCell.emptyCells.push({ i, j });
            }
        }
    }
    return areaOfCell;
}

// start timer and render it
function startTimer() {
    var beginTime = Date.now();
    gGameTimeInterval = setInterval(function () {
        gGame.time = +((Date.now() - beginTime) / 1000).toFixed(0);
        var timer = document.querySelector('.time');
        timer.innerText = `Time:\n${gGame.time}\nseconds`;
    }, 1000);
}