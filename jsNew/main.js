const EVT_PLAYER_ENDED_MOVE     = 0,
      EVT_ENEMY_ENDED_MOVE      = 1,
      STATE_TITLE_SCREEN        = 2,
      STATE_PLAYING             = 3,
      STATE_STANDBY             = 4,
      STATE_INITIALIZATION      = 5,
      EVT_PLAYER_DAMAGE         = 6,
      STATE_GAMEOVER            = 7,
      EVT_WALL_DESTROYED        = 8,
      INIT_LEVEL                = 1;

const storyline = [
    "Scavenge for survival",
    "Oops. I am not alone",
    "Obstacles are the key",
    "Nude ones are short sighted",
    "I can destroy obstacles too",
    "Brown jackets are trouble",
    "Each move counts",
    "Harder than I thought",
    "I hate Zetas",
    "It's a long way to the top"
];

const categories = [
    "Burguer meat",
    "Zombie fodder",
    "Novice",
    "Inexperienced",
    "Second rate",
    "Mediocre",
    "Handy",
    "Skilled",
    "Old timer",
    "Veteran",
    "Seasoned pro",
    "Superb",
    "Outstanding",
    "Master"
];

var SYS_spriteParams = {
        w: 32,
        h: 32,
        iW: 256,
        img: "s3.png",
        t: $("screen")
    },
    columns = 8, rows = 8, level = 2, screen, score, title, oldTime,
    floorTiles = [31], wallTiles = [25, 26, 27, 28, 29, 30],
    outerWallTiles = [21, 22, 23, 24], foodTiles = [18, 19],
    enemyTiles = [6, 12], enemyHit = [20, 30], enemyAI = [3, 4],
    board = [], objects = [], enemies = [], gridPositions = [], player, detection, enemiesToMove = [],
    initialEnergy = 25, currentEnergy, maxEnergy,
    isPlayerMoving = false, isPlayerTurn = true, isPlayerDetectedBy = null,
    isEnemyMoving = false, animating = false, gameIsOver = false,
    gameState = STATE_INITIALIZATION,
    FRUIT_ENERGY = 12, SODA_ENERGY = 20,
    soundLib = [];

var sounds = [
    [2,0.0266,0.5034,0.5728,0.5999,0.5026,,-0.0108,-0.4073,,,,,0.543,0.7178,0.7558,,0.9082,0.9809,0.1312,-0.4545,0.0055,0.0025,0.4], // 0 - detection
    [3,0.14,0.31,0.0939,0.47,0.03,0.0071,-0.1999,0.34,0.24,0.0685,-0.28,,0.0233,-0.0799,,0.0104,0.4403,0.27,0.02,0.21,0.12,-0.18,0.32], // 1 - zombie attack
    [3,,0.35,0.53,0.2582,0.1909,,0.2963,,,,,,,,,0.3,-0.0396,1,,,,,0.18], // 2 - wall attack
    [0,,0.0878,,0.4572,0.2507,,0.2093,,0.1437,0.3611,,,0.5666,,,,,1,,,,,0.3], // 3 - food
    [0,0.34,0.26,0.24,0.23,,,0.1232,0.1466,0.24,1,0.9299,,,-1,1,-0.8,-0.04,0.33,-0.02,,,-1,0.36], // 4 - walk
    [3,0.0171,0.9078,0.3427,0.4125,0.5181,0.0587,-0.1099,0.484,0.0317,0.4421,-0.4199,0.5661,0.049,0.0066,0.2124,-0.8404,-0.1955,0.3985,-0.0415,,0.0212,-0.0439,0.32] // 5 - exit level
];

function initSound() {
    sounds.forEach(function(s, i) {
        var fx = jsfxr(s);
        var a = new Audio();
        a.src = fx;
        soundLib.push(a);
    });
}

function init() {
    // Clears our list gridPositions and prepares it to generate a new board.
    gridPositions = [];
    for (var x = 1; x < columns-1; x++) {
        for (var y = 1; y < rows -1; y++) {
            if (((x == 1 || x == 2) && y == 6) || ((x == 1 || x == 2) && y == 7) || ((x == 0 || x == 1 || x == 2) && y == 5)) continue;
            gridPositions.push([x, y]);
        }
    }
    board = [];
    enemies = [];
    object = [];
    var childs = $("screen").children;
    for (x=0, l=childs.length;x<l; x++) {
        if (childs[x] && childs[x].parentNode) {
            childs[x].parentNode.removeChild(childs[x]);
        }
    }
    
    // Generate random background tiles
    for (var x=-1; x<columns+1; x++) {
        for (var y=-1; y<rows+1; y++) {
            var tile = DHTMLSprite(SYS_spriteParams);
            tile.bI(floorTiles[randomRange(0, floorTiles.length)]);

            if (x === -1 || x === columns || y === -1 || y === rows) {
                tile.bI(outerWallTiles[randomRange(0, outerWallTiles.length)]);
            }

            board.push([tile, x, y, "t"]); // sprite, posX, posY, type: t for tile, e for entity, f for food... 
        }
    }

    // the exit
    var exitSprite = DHTMLSprite(SYS_spriteParams);
    exitSprite.bI(20);
    board.push([exitSprite, columns-1, 0]);

    // wall tiles
    objects = layoutObjectsAtRandom(wallTiles, 5, 10, "w");

    // food tiles
    objects = objects.concat(layoutObjectsAtRandom(foodTiles, 1, 5, "f"));

    // enemies
    var enemyCount = Math.log2(level) | 0;
    var enemyAnims = {
        i:  [0, 1, 2, 3, 4, 5],
        a:  [28, 29], // 24, 25
        v:  4
    };
    enemies = layoutObjectsAtRandom(enemyTiles, enemyCount, enemyCount, "e", enemyAnims);

    var playerSprite = DHTMLSprite(SYS_spriteParams);
    playerSprite.cI(0);
    playerSprite.aA({
        i: [0, 1, 2, 3, 4, 5],
        a: [32, 33],
        d: [38, 39],
        v: 6
    });
    playerSprite.cA("i");
    player = [playerSprite, 0, rows-1, "p"];

    // score
    screen = $("screen");
    score = create("div", "score");
    score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
    screen.appendChild(score);
    score.update = function() {
        score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
    };
}

// --------------------------------------------------------------------------------------

function drawItem(t) {
    t[0].dw((t[1]+1)*SYS_spriteParams.w, (t[2]+1)*SYS_spriteParams.h);
}

function launchDetectIcon() {
    var spr = DHTMLSprite(SYS_spriteParams);
    spr.bI(46);
    spr.aA({i: [1, 0], v: 8});
    spr.cA("i");
    detection = [spr, player[1]+.5, player[2]-.5, "!"];
    pause(function() {
        detection[0].k();
        detection = null;
    }, 1000);
    soundLib[0].play();
}

// LayoutObjectAtRandom accepts an array of game objects to choose from 
// along with a minimum and maximum range for the number of objects to create.
function layoutObjectsAtRandom(tiles, min, max, type, anims) {
    var objectCount = randomRange(min, max+1);
    var destArray = [];
    for (var i=0; i<objectCount; i++) {
        (function() {
            var rndPos = randomPosition();
            var sprite = DHTMLSprite(SYS_spriteParams);
            var choice = randomRange(0, tiles.length);
            var tileChoice = tiles[choice];
            sprite.bI(tileChoice);

            if (type !== "e") {
                var t = [sprite, rndPos[0], rndPos[1], type]; // sprite, x, y, type, energy
                t[4] = 2; // in case is a wall
                if (type === "f") { // FOOD
                    if (tileChoice === 19) {
                        t[4] = FRUIT_ENERGY;
                    } else {
                        t[4] = SODA_ENERGY;
                    }
                }
                destArray.push(t);
            } else { // ENEMIES
                var ans = Object.assign({}, anims);
                if (tileChoice == 12) ans.a = [24, 25]; // patch for new spritesheet
                sprite.aA(ans);
                sprite.cA("i");
                var e = [sprite, rndPos[0], rndPos[1], type]; // sprite, x, y, type, hitPoints, viewRange
                if (tileChoice == 6 || tileChoice == 12) {
                    e[4] = enemyHit[choice];
                    e[5]= enemyAI[choice];
                }
                e[3] = type;
                destArray.push(e);
            }
        })();
    }
    return destArray;
};

function attemptMove(char, dir) {
    var destX = char[1];
    if (dir == "r") {
        destX++;
    }
    if (dir == "l") {
        destX--;
    }
    var destY = char[2];
    if (dir == "u") {
        destY--;
    }
    if (dir == "d") {
        destY++;
    }

    for (var i=0; i<enemies.length; i++) {
        if (enemies[i][1] == destX && enemies[i][2] == destY && enemies[i][3] !== "f") {
            return "n";
        }
    }
    for (var i=0; i<objects.length; i++) {
        if (objects[i][1] == destX && objects[i][2] == destY) {
            return objects[i];
        }
    }
    if (player[1] == destX && player[2] == destY) return player;
    return "y";
};

function damage(entity) {
    entity[4] --;
    if (entity[4] == 1) entity[0].cI(entity[0].i() + 15);
    if (entity[4] <= 0) {
        entity[3] = "r";
        entity[0].k();
        gameCallback(EVT_WALL_DESTROYED);
    }
}

function doAnimate(char, dir) {
    animating = true;

    var moveAttempt = attemptMove(char, dir);
    if (moveAttempt === "n") {
        endCharacterMove(char);
        return;
    } else if (moveAttempt[3] === "w" || moveAttempt[3] === "p") {
        if (moveAttempt[3] === "p") {
            moveAttempt[0].cA("d");
            gameCallback(EVT_PLAYER_DAMAGE, char[4]);
            var forcePlayerIdle = true;
            soundLib[1].play();
        }
        if (moveAttempt[3] === "w") {
            var r = randomRange(1, 4);
            if (isPlayerDetectedBy != char && r < 2) {
                endCharacterMove(char);
                return;
            }
            damage(moveAttempt);
            soundLib[2].play();
        }
        char[0].cA("a");
        pause(function() {
            char[0].cA("i");
            if (forcePlayerIdle) moveAttempt[0].cA("i");
            endCharacterMove(char);
        }, 500);
        return;
    }

    var x = char[1], y = char[2];
    switch (dir) {
        case "l":
            if (char[1] > 0) {
                x--;
                char[0].diff(-1, 0);
                playWalkSound();
            }
            break;
        case "r":
            if (char[1] < columns-1) {
                x++;
                char[0].diff(1, 0);
                playWalkSound();
            }
            break;
        case "u":
            if (char[2] > 0) {
                y--;
                char[0].diff(0, -1);
                playWalkSound();
            }
            break;
        case "d":
            if (char[2] < rows-1) {
                y++;
                char[0].diff(0, 1);
                playWalkSound();
            }
            break;
    }
    endCharacterMove(char, x, y);
}

function playWalkSound() {
    soundLib[4].play();
}

// RandomPosition returns a random position from our list gridPositions.
function randomPosition() {
    var randomIndex = randomRange(0, gridPositions.length);
    var randomPosition = gridPositions.splice(randomIndex, 1)[0];

    return randomPosition;
};

function decideMovement(enemy) {
    // enemy [sprite, x, y, type, hitPoints, viewRange]
    var options = ["l", "r", "u", "d"];
    var distanceToPlayer = Math.abs(enemy[1] - player[1]) + Math.abs(enemy[2] - player[2]);
    var decision = ""; 

    if (distanceToPlayer <= enemy[5]) {
        if (!detection && !isPlayerDetectedBy) {
            isPlayerDetectedBy = enemy;
            launchDetectIcon();
        }
        if (enemy[2] > player[2]) {
            decision = "u";
        } else if (enemy[2] < player[2]) {
            decision = "d";
        } 
        if (decision === "") {
            if (enemy[1] > player[1]) {
                decision = "l";
            } else if (enemy[1] < player[1]) {
                decision = "r";
            }
        }
    } else { // random decision
        decision = options[randomRange(0, options.length)];
        if (isPlayerDetectedBy == enemy) isPlayerDetectedBy = null;
    }
    doAnimate(enemy, decision);
}

function checkCurrentTile() {
    objects.forEach(function(obj, i) {
        // sprite, x, y, "f" (type), energy
        if (obj[1] === player[1] && obj[2] === player[2]) {
            currentEnergy += obj[4];
            soundLib[3].play();
            objects.splice(i, 1);
            obj[0].k();
            return false;
        }
    });
    if (player[1] === columns-1 && player[2] === 0) {
        return true;
    }
}

function checkMaxEnergy() {
    if (maxEnergy < currentEnergy) maxEnergy = currentEnergy;
}

function checkGameOver() {
    if (currentEnergy <= 0) {
        gameIsOver = true;
        gameState = STATE_GAMEOVER;
    }
}

function gameLoop() {
    var newTime = +new Date();
    var elapsed = newTime - oldTime;
    oldTime = newTime;
    
    switch (gameState) {
        case STATE_INITIALIZATION: 
            gameIsOver = false;
            isPlayerDetectedBy = null;
            currentEnergy = maxEnergy = initialEnergy;
            level = INIT_LEVEL;
            init();
            gameState = STATE_TITLE_SCREEN;
            break;

        case STATE_PLAYING:
            if (isPlayerTurn && !isPlayerMoving) {
                checkMaxEnergy();
                checkGameOver();
                handleKeys();
            } else if (!isPlayerTurn && !isEnemyMoving) {
                var enemy = enemiesToMove.pop();
                if (enemy) {
                    pause(function() {
                        decideMovement(enemy);
                    }, 250);
                    isEnemyMoving = true;
                } else {
                    isPlayerTurn = true;
                }
            }

            break;

        case STATE_TITLE_SCREEN:
            /*
            https://developer.mozilla.org/en-US/docs/Web/API/Window/speechSynthesis
            https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
            
            https://twitter.com/intent/tweet?url=http%3A%2F%2Fmydomain%2F%3Fparam1%3Dsomething%26param2%3Dsomtehing%26param3%3Dsomething&text=hola%20caracola
            */
            var synth = window.speechSynthesis;
            pause(function() {
                var voices = synth.getVoices();
                var selected = 0;
                voices.forEach(function(v, i) {
                    if (v.lang.indexOf("en") >= 0 && v.name == "Google UK English Male") {
                        selected = i;
                    }
                });
                var utter = new SpeechSynthesisUtterance("Day " + level + ". " + (storyline[level-1] || ""));
                utter.voice = voices[selected];  // 9 es graciosa
                utter.pitch = 0.5;
                utter.rate = 0.8;
                synth.speak(utter);
            }, 500);
            
            title.innerHTML = "<p>DAY " + level + ".</p><p class='small'>"+(storyline[level-1] || "")+"</p>";
            screen.style.display = "none";
            title.style.display = "block";
            gameState = STATE_STANDBY;
            pause(function() {
                init();
                screen.style.display = "block";
                title.style.display = "none";
                gameState = STATE_PLAYING;
            }, 2500);
            break;

        case STATE_STANDBY:
            break;

        case STATE_GAMEOVER:
            var outcome = (level >= l) ?  categories[l-1] : categories[level] || categories[0];
            var twTxt = "I died of starvation after " + level + " days of zombie apocalypse. I am a " + outcome + " scavenger.";
            title.innerHTML = "<p>You DIED</p><p class='small'>of starvation after " + level + " days.<br/>You managed to have " + maxEnergy + " food.<br/>You scored as<br/>"+outcome+" scavenger.<br/><a href='https://twitter.com/intent/tweet?url=http%3A%2F%2Fmydomain%2F%3Fparam1%3Dsomething%26param2%3Dsomtehing%26param3%3Dsomething&text=" + twTxt + "' target='_blank'>TWEET IT!</a></p>";
            screen.style.display = "none";
            title.style.display = "block";
            gameState = STATE_STANDBY;
    }
    
    updateLoop(elapsed);
    drawLoop();
    
    requestAnimFrame(gameLoop);
}

function gameCallback(msg) {
    //if (gameOverFlag) return;

    switch (msg) {
        case EVT_PLAYER_ENDED_MOVE:
            currentEnergy--;

            var isExit = checkCurrentTile();

            if (isExit) {
                isPlayerTurn = true;
                isPlayerMoving = false;
                isPlayerDetectedBy = null;
                soundLib[5].play();
                pause(function() {
                    level++;
                    gameState = STATE_TITLE_SCREEN;
                }, 1000);
            } else {
                pause(function() {
                    isPlayerTurn = false;
                    isPlayerMoving = false;
                    enemiesToMove = enemies.slice(0);
                }, 250);
            }
            score.update();
            break;

        case EVT_ENEMY_ENDED_MOVE:
            isEnemyMoving = false;
            break;

        case EVT_PLAYER_DAMAGE: 
            currentEnergy -= arguments[1];
            score.update();
            break;

        case EVT_WALL_DESTROYED:
            for (var q=0; q<objects.length; q++) {
                var w = objects[q];
                if (w[3] === "r") { // change any value for "r" and remove
                    objects.splice(q, 1);
                    break;
                }
            }
            break;
    }
}

function updateLoop(dt) {
    player[0].mv(dt);
    if (animating) {
        var diff = player[0].dxy();
        player[1] += diff[0] * dt;
        player[2] += diff[1] * dt;
    }
    
    enemies.forEach(function(e) {
        e[0].mv(dt);
        if (animating) {
            var diff = e[0].dxy();
            e[1] += diff[0] * dt;
            e[2] += diff[1] * dt;
        }
    });
    
    if (detection) detection[0].mv(dt);
}

function handleKeys() {
    isPlayerMoving = true;
    if (keys[0]) { // left
        doAnimate(player, "l");
    } else if (keys[2]) {  // right
        doAnimate(player, "r");
    } else if (keys[1]) {  // up
        doAnimate(player, "u");
    } else if (keys[3]) {
        doAnimate(player, "d");
    } else {
        isPlayerMoving = false;
    }
}

function endCharacterMove(char, x, y) {
    pause(function() {
        animating = false;
        char[0].diff(0, 0);
        if(x) char[1] = x;
        if(y) char[2] = y;
        char[1] = rd(char[1]);
        char[2] = rd(char[2]);
        if (char[3] == "p") {
            gameCallback(EVT_PLAYER_ENDED_MOVE);
        } else {
            gameCallback(EVT_ENEMY_ENDED_MOVE);
        }
    }, 500);
}

function drawLoop() {
    board.forEach(drawItem); // draw Board
    objects.forEach(drawItem); // draw walls and food
    enemies.forEach(drawItem); // draw enemies
    drawItem(player); // draw player
    if (detection) drawItem(detection); // draw detection icon
}

function switchMusic() {
    gainNode.gain.value = gainNode.gain.value == -1 ? -.84 : -1;
}

var keys = [0, 0, 0, 0];
document.onkeyup = document.onkeydown = function (e) {
    e.preventDefault();
    var code = e.keyCode-37;
    if (e.type == "keyup") {
        keys[code] = 0;
        if (code == 40) switchMusic();
    } else {
        keys[code] = 1;
    }
    if (gameIsOver) {
        gameState = STATE_INITIALIZATION;
    }
}

title = $("title");
screen = $("screen");
pause(function() {
    initSound();
}, 500);
gameLoop();