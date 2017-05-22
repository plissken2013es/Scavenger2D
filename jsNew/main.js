const EVT_PLAYER_ENDED_MOVE     = 0,
      EVT_ENEMY_ENDED_MOVE      = 1,
      STATE_TITLE_SCREEN        = 2,
      STATE_PLAYING             = 3,
      STATE_STANDBY             = 4,
      STATE_INITIALIZATION      = 5,
      EVT_PLAYER_DAMAGE         = 6,
      STATE_GAMEOVER            = 7,
      EVT_WALL_DESTROYED        = 8;

var SYS_spriteParams = {
        w: 32,
        h: 32,
        iW: 256,
        img: "sprites/spr.png",
        t: $("screen")
    },
    columns = 8, rows = 8, level = 2, screen, score, title, oldTime,
    floorTiles = [32, 33, 34, 35, 36, 37, 38, 39], wallTiles = [25, 26, 27, 28, 29, 30],
    outerWallTiles = [21, 22, 23, 24], foodTiles = [18, 19],
    enemyTiles = [6, 12], enemyHit = [25, 35], enemyAI = [3, 5],
    board = [], objects = [], enemies = [], gridPositions = [], player, enemiesToMove = [],
    initialEnergy = 25, currentEnergy = 25,
    isPlayerMoving = false, isPlayerTurn = true, isEnemyMoving = false, animating = false,
    gameState = STATE_INITIALIZATION,
    FRUIT_ENERGY = 15, SODA_ENERGY = 30;

function init() {
    // Clears our list gridPositions and prepares it to generate a new board.
    gridPositions = [];
    for (var x = 1; x < columns-1; x++) {
        for (var y = 1; y < rows -1; y++) {
            if ((x == 1 && y == 6) || (x == 1 && y == 7)) continue;
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
        a:  [36, 37],
        v:  4
    };
    enemies = layoutObjectsAtRandom(enemyTiles, enemyCount, enemyCount, "e", enemyAnims);

    var playerSprite = DHTMLSprite(SYS_spriteParams);
    playerSprite.cI(0);
    playerSprite.aA({
        i: [0, 1, 2, 3, 4, 5],
        a: [40, 41],
        d: [46, 47],
        v: 6
    });
    playerSprite.cA("i");
    player = [playerSprite, 0, rows-1, "p"];
    playerSprite.log();

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
                sprite.aA(anims);
                sprite.cA("i");
                var e = [sprite, rndPos[0], rndPos[1], type]; // sprite, x, y, type, hitPoints, viewRange
                if (tileChoice === 6 || tileChoice === 12) {
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
    //gameSounds.playSound(randomRange(5, 6)); // footsteps
    return "y";
};

function damage(entity) {
    entity[4] --;
    console.log("wall life:", entity[4]);
    if (entity[4] == 1) entity[0].cI(entity[0].i() + 31);
    if (entity[4] <= 0) {
        entity[3] = "r";
        entity[0].k();
        gameCallback(EVT_WALL_DESTROYED);
    }
}

function doAnimate(char, dir) {
    console.log("doAnimate", char, dir);
    animating = true;

    var moveAttempt = attemptMove(char, dir);
    console.log("moveAttempt=", moveAttempt, "wall?", moveAttempt[3] === "w", "player", moveAttempt[3] === "p");
    if (moveAttempt === "n") {
        endCharacterMove(char);
        return;
    } else if (moveAttempt[3] === "w" || moveAttempt[3] === "p") {
        if (moveAttempt[3] === "p") {
            moveAttempt[0].cA("d");
            gameCallback(EVT_PLAYER_DAMAGE, char[4]);
            var forcePlayerIdle = true;

            //gameSounds.playSound(randomRange(3, 4)); // zombie attack sound
        }
        if (moveAttempt[3] === "w") {
            damage(moveAttempt);
            //gameSounds.playSound(randomRange(0, 1));  // player (OR ZOMBIE) chop sound
        }
        char[0].cA("a");
        setTimeout(function() {
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
            }
            break;
        case "r":
            if (char[1] < columns-1) {
                x++;
                char[0].diff(1, 0);
            }
            break;
        case "u":
            if (char[2] > 0) {
                y--;
                char[0].diff(0, -1);
            }
            break;
        case "d":
            if (char[2] < rows-1) {
                y++;
                char[0].diff(0, 1);
            }
            break;
    }
    endCharacterMove(char, x, y);
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
    }
    console.log("enemy moves from", enemy[1], ",", enemy[2], "direction", decision);
    doAnimate(enemy, decision);
}

function checkCurrentTile() {
    objects.forEach(function(obj, i) {
        // sprite, x, y, "f" (type), energy
        if (obj[1] === player[1] && obj[2] === player[2]) {
            currentEnergy += obj[4];
            if (obj[4] > FRUIT_ENERGY) {
                //gameSounds.playSound(randomRange(7, 8));
            } else {
                //gameSounds.playSound(randomRange(10, 11));
            }
            objects.splice(i, 1);
            obj[0].k();
            return false;
        }
    });
    if (player[1] === columns-1 && player[2] === 0) {
        return true;
    }
}

function gameLoop() {
    var newTime = +new Date();
    var elapsed = newTime - oldTime;
    oldTime = newTime;
    
    switch (gameState) {
        case STATE_INITIALIZATION:                            
            currentEnergy = initialEnergy;
            level = 2;
            init();
            gameState = STATE_TITLE_SCREEN;
            break;

        case STATE_PLAYING:
            if (isPlayerTurn && !isPlayerMoving) {
                //checkGameOver();
                handleKeys();
            } else if (!isPlayerTurn && !isEnemyMoving) {
                var enemy = enemiesToMove.pop();
                if (enemy) {
                    decideMovement(enemy);
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
            */
            var synth = window.speechSynthesis;
            setTimeout(function() {
                var voices = synth.getVoices();
                var selected = 0;
                voices.forEach(function(v, i) {
                    if (v.lang.indexOf("en") >= 0 && v.name == "Google UK English Male") {
                        console.log(i, v);
                        selected = i;
                    }
                });
                console.log(voices);
                var utter = new SpeechSynthesisUtterance("Day " + level + ". Scavenge for survival.");
                utter.voice = voices[selected];  // 9 es graciosa
                utter.pitch = 0.5;
                utter.rate = 0.8;
                synth.speak(utter);
            }, 500);
            
            title.innerHTML = "<p>DAY " + level + "</p>";
            screen.style.display = "none";
            title.style.display = "block";
            gameState = STATE_STANDBY;
            setTimeout(function() {
                init();
                screen.style.display = "block";
                title.style.display = "none";
                gameState = STATE_PLAYING;
            }, 2500);
            break;

        case STATE_STANDBY:
            break;

        case STATE_GAMEOVER:
            title.innerHTML = "<p>You died of starvation <br />after " + level + " days.</p>";
            screen.style.display = "none";
            title.style.display = "block";
            gameState = STATE_STANDBY;
            setTimeout(function() {
                gameState = STATE_INITIALIZATION;
            }, 3500);
    }
    
    updateLoop(elapsed);
    drawLoop();
    
    requestAnimFrame(gameLoop);
}

function gameCallback(msg) {
    console.log("gameCallback", msg);
    //if (gameOverFlag) return;

    switch (msg) {
        case EVT_PLAYER_ENDED_MOVE:
            console.log("player ended move");
            currentEnergy--;

            var isExit = checkCurrentTile();
            console.log("isExit", isExit);

            if (isExit) {
                isPlayerTurn = true;
                isPlayerMoving = false;
                setTimeout(function() {
                    level++;
                    gameState = STATE_TITLE_SCREEN;
                }, 1000);
            } else {                        
                isPlayerTurn = false;
                isPlayerMoving = false;
                enemiesToMove = enemies.slice(0);
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
    console.log("endCharacterMove type=", char[3], "pos=", x | char[1], y | char[2]);
    setTimeout(function() {
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
}

var keys = [0, 0, 0, 0];
document.onkeyup = document.onkeydown = function (e) {
    e.preventDefault();
    var code = e.keyCode-37;
    if (e.type == "keyup") {
        keys[code] = 0;
    } else {
        keys[code] = 1;
    }
}

title = $("title");
screen = $("screen");
gameLoop();