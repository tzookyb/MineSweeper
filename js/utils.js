function say(phrase, seconds) {
    clearInterval(gAnnounceTimeout);
    gAnnounce.innerText = phrase
    gAnnounce.style.visibility = 'visible';
    gAnnounceTimeout = setTimeout(function () { gAnnounce.style.visibility = 'hidden' }, seconds * 1000)
}

function createMatrix(size, isManual = false) {
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

            currCellClass = (currCell.isShown) ? ' show-cell' : '';
            currCellClass += (currCell.isHint) ? ' hinted-cell' : '';
            if (currCell.isFlagged && gGame.isOn || currCell.isFlagged && gGame.isHint && !currCell.isHint) currCellContent = `<img style="display:block;" width="100%" height="100%" src="img/flag.ico"/>`;
            else if (currCell.isMine) {
                currCellContent = `<img style="display:block" width="100%" height="100%" src="img/mine.ico"/>`;
                if (currCell.isMineExploded) currCellClass += ' lose';
                if (currCell.isFlagged) currCellContent = `<img style="display:block" width="100%" height="100%" src="img/det_mine.ico"/>`;
            } else if (currCell.minesAroundCount) {
                currCellContent = currCell.minesAroundCount;
                if (currCellContent === 1) currCellClass += ' one';
                if (currCellContent === 2) currCellClass += ' two';
                if (currCellContent === 3) currCellClass += ' three';
                if (currCellContent >= 4) currCellClass += ' four';

            }
            htmlStr += `<td class="cell${currCellClass}" data-id="${i},${j}" oncontextmenu="flagCell(${i},${j},event,this)" onclick="cellClicked(${i},${j},this,true)">`
            //div that hides the cell content
            htmlStr += currCell.isShown ? '' : `<div class="hide-cell">`;
            htmlStr += currCellContent;
            htmlStr += `</div></td>\n`
        }
        htmlStr += `</tr>\n`
    }
    document.querySelector('tbody').innerHTML = htmlStr;
    
    // lives rendering
    document.querySelector('.lives').innerHTML = 'Lives Remaining:<br/><span></span>';
    var lives = document.querySelector('.lives span');
    lives.innerHTML = '';
    for (var i = 0; i < gGame.lives; i++) {
        lives.innerHTML += `<img width="50px" height="50px" src="img/heart.png"/>`;
    } for (i; i < 3; i++) {
        lives.innerHTML += `<img width="50px" height="50px" src="img/noheart.png"/>`;
    }

    // hints rendering
    var hintsSelector = document.querySelector('.hint img');
    if (gGame.hints < 1) hintsSelector.src = 'img/nohint.png';
    else if (gGame.isHint) hintsSelector.src = 'img/hinton.png';
    else hintsSelector.src = 'img/hintoff.png';
    document.querySelector('.hintcounter').innerText = gGame.hints;

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

// count neighbors:
function checkCellArea(cellI, cellJ) {
    // [0] are locations of mines nearby, [1] are locations of cells unshown that have neighbouring mines
    // [2] holds locations of cells not shown that have no neighbouring mines, [3] holds location of current cell checked
    var areaOfCell = [[], [], [], []];
    for (var i = cellI - 1; i <= cellI + 1; i++) {
        if (i < 0 || i >= gBoard.length) continue;
        for (var j = cellJ - 1; j <= cellJ + 1; j++) {
            var currCell = gBoard[i][j];
            if (i === cellI && j === cellJ) {
                areaOfCell[3].push({ i, j });
                continue
            }
            if (j < 0 || j >= gBoard[i].length) continue;

            if (currCell.isMine) areaOfCell[0].push({ i, j });
            else if (currCell.minesAroundCount && !currCell.isShown) areaOfCell[1].push({ i, j });
            else if (!currCell.minesAroundCount && !currCell.isShown) areaOfCell[2].push({ i, j });
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

//get date
function getTime() {
    return new Date().toString().split(' ')[4];
}