var SYS_spriteParams = {
        w: 32,
        h: 32,
        iW: 256,
        img: "sprites/Scavengers_SpriteSheet.png",
        t: $("screen")
    },
    columns = 8, rows = 8, level = 2, screen, score,
    floorTiles = [32, 33, 34, 35, 36, 37, 38, 39], wallTiles = [25, 26, 27, 28, 29, 30],
    outerWallTiles = [21, 22, 23, 24], foodTiles = [18, 19],
    enemyTiles = [6, 12], enemyHit = [25, 35], enemyAI = [3, 5],
    board = [], objects = [], enemies = [], gridPositions = [], player,
    initialEnergy = 25, currentEnergy = 25,
    isPlayerMoving = false,
    FRUIT_ENERGY = 15, SODA_ENERGY = 30;

// Clears our list gridPositions and prepares it to generate a new board.
for (var x = 1; x < columns-1; x++) {
    for (var y = 1; y < rows -1; y++) {
        gridPositions.push([x, y]);
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
var playerAnims = {
    i: [0, 1, 2, 3, 4, 5],
    a: [40, 41],
    d: [46, 47],
    v: 6
};
player = [playerSprite, 0, rows-1, "p", playerAnims];

// score
screen = $("screen");
score = create("div", "score");
score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
screen.appendChild(score);
score.update = function() {
    score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
};

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
                if (type === "f") {
                    if (tileChoice === 19) {
                        t[4] = FRUIT_ENERGY;
                    } else {
                        t[4] = SODA_ENERGY;
                    }
                }
                destArray.push(t);
            } else {
                var e = [sprite, rndPos[0], rndPos[1], type, anims]; // sprite, x, y, type, anims, hitPoints, viewRange
                if (tileChoice === 6 || tileChoice === 12) {
                    e[5] = enemyHit[choice];
                    e[6]= enemyAI[choice];
                }
                e[4] = type;
                destArray.push(e);
            }
        })();
    }
    return destArray;
};

// RandomPosition returns a random position from our list gridPositions.
function randomPosition() {
    var randomIndex = randomRange(0, gridPositions.length);
    var randomPosition = gridPositions.splice(randomIndex, 1)[0];

    return randomPosition;
};

function gameLoop() {
    console.log("tick");
    
    if (!isPlayerMoving) handleKeys();
    updateLoop();
    drawLoop();
    
    requestAnimFrame(gameLoop);
}

function updateLoop() {
    // to-do
}

function handleKeys() {
    isPlayerMoving = true;
    if (keys[0]) { // left
        player[1] -= 1;
        //world.player.animation("left", world.objects, world.enemies);
    } else if (keys[2]) {  // right
        player[1] += 1;
        //world.player.animation("right", world.objects, world.enemies);
    } else if (keys[1]) {  // up
        player[2] -= 1;
        //world.player.animation("up", world.objects, world.enemies);
    } else if (keys[3]) {
        player[2] += 1;
        //world.player.animation("down", world.objects, world.enemies);
    } else {
        //isPlayerMoving = false;
    }
    setTimeout(function(){
        isPlayerMoving = false;
    }.bind(this), 250);
}

function drawLoop() {
    board.forEach(drawItem); // draw Board
    objects.forEach(drawItem); // draw walls and food
    enemies.forEach(drawItem); // draw enemies
    drawItem(player); // draw player
}

$("screen").style.display = "block";

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

gameLoop();