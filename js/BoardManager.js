function BoardManager() {
    var wallCount = Count(5, 9), foodCount = Count(1, 5),
        floorTiles = [32, 33, 34, 35, 36, 37, 38, 39], wallTiles = [25, 26, 27, 28, 29, 30], 
        foodTiles = [18, 19], enemyTiles = [6, 12], enemyHit = [25, 50], enemyAI = [3, 5], 
        outerWallTiles = [21, 22, 23, 24], 
        gridPositions = [], board = [], objects = [], enemies = [], exit, player;

    
    // Clears our list gridPositions and prepares it to generate a new board.
    var initialiseList = function() {
        gridPositions = [];
        
        for (var x = 1; x < columns-1; x++) {
            for (var y = 1; y < rows -1; y++) {
                gridPositions.push([x, y]);
            }
        }
    };
    
    // Sets up the outer walls and floor (background) of the game board.
    var boardSetup = function() {
        for (var x=-1; x<columns+1; x++) {
            for (var y=-1; y<rows+1; y++) {
                var tile = DHTMLSprite(SYS_spriteParams);
                tile.baseImage(floorTiles[randomRange(0, floorTiles.length)]);
                
                if (x === -1 || x === columns || y === -1 || y === rows) {
                    tile.baseImage(outerWallTiles[randomRange(0, outerWallTiles.length)]);
                }
                
                board.push(Tile(tile, [x, y]));
            }
        }
        
        var exitSprite = DHTMLSprite(SYS_spriteParams);
        exitSprite.baseImage(20);
        exit = Tile(exitSprite, [columns-1, 0]);
        board.push(exit);
    };
    
    // RandomPosition returns a random position from our list gridPositions.
    var randomPosition = function() {
        var randomIndex = randomRange(0, gridPositions.length);
        var randomPosition = gridPositions.splice(randomIndex, 1)[0];
        
        return randomPosition;
    };
    
    // LayoutObjectAtRandom accepts an array of game objects to choose from 
    // along with a minimum and maximum range for the number of objects to create.
    var layoutObjectAtRandom = function(params) {
        // tileArray, minimum, maximum, destArray
        var tileArray       = params.tileArray,
            minimum         = params.minimum,
            maximum         = params.maximum,
            destArray       = params.destArray,
            type            = params.type || "tile",
            anims           = params.anims || null,
            gameCallback    = params.gameCallback;
        
        var objectCount = randomRange(minimum, maximum+1);
        
        for (var i=0; i<objectCount; i++) {
            (function() {
                var rndPos = randomPosition();
                var sprite = DHTMLSprite(SYS_spriteParams);
                var choice = randomRange(0, tileArray.length);
                var tileChoice = tileArray[choice];
                sprite.baseImage(tileChoice);

                if (type !== "entity") {
                    var t = Tile(sprite, rndPos, gameCallback);
                    t.type = type;
                    if (type === "food") {
                        if (tileChoice === 19) {
                            t.energy = FRUIT_ENERGY;
                        } else {
                            t.energy = SODA_ENERGY;
                        }
                    }
                    destArray.push(t);
                } else {
                    var e = Entity(sprite, rndPos, anims, gameCallback);
                    if (tileChoice === 6 || tileChoice === 12) {
                        e.hitPoints = enemyHit[choice];
                        e.view_range = enemyAI[choice];
                    }
                    e.type = type;
                    destArray.push(e);
                }        
            })();
        }
    };
    
    var attachScore = function() {
        var screen = document.getElementById("screen");
        var score = document.createElement("div");
        score.setAttribute("id", "score");
        score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
        screen.appendChild(score);
        
        score.move = function() {
            score.innerHTML = "<p>energy: " + currentEnergy + "</p>";
        };
        
        SYS_process.add(score);
    };
    
    return {
        // SetupScene initializes our level and calls the previous functions to lay out the game board
        setupScene: function(level, gameCallback) {
            boardSetup();
            
            initialiseList();
            
            // wall tiles
            var params = {
                tileArray:  wallTiles, 
                minimum:    wallCount.min, 
                maximum:    wallCount.max, 
                destArray:  objects,
                gameCallback: gameCallback,
                type:       "wall"
            };
            layoutObjectAtRandom(params);
            
            // food tiles
            params = {
                tileArray:  foodTiles, 
                minimum:    foodCount.min, 
                maximum:    foodCount.max, 
                destArray:  objects,
                type:       "food"
            };
            layoutObjectAtRandom(params);
            
            // enemies
            var enemyCount = Math.log2(level) | 0;
            var enemyAnims = {
                "idle":     [0, 1, 2, 3, 4, 5],
                "attack":   [36, 37],
                velocity:   4
            };
            params = {
                tileArray:      enemyTiles, 
                minimum:        enemyCount, 
                maximum:        enemyCount, 
                destArray:      enemies,
                type:           "entity",
                anims:          enemyAnims,
                gameCallback:   gameCallback
            };
            layoutObjectAtRandom(params);
            
            var playerSprite = DHTMLSprite(SYS_spriteParams);
            playerSprite.changeImage(0);
            var playerAnims = {
                "idle": [0, 1, 2, 3, 4, 5],
                "attack": [40, 41],
                "damage": [46, 47],
                velocity: 6
            };
            player = Entity(playerSprite, [0, rows-1], playerAnims, gameCallback);
            player.type = "player";
            
            attachScore();
            
            return {board: board, objects: objects, enemies: enemies, player: player};
        },
        
        drawBoard: function() {
            for (var q=0; q<board.length; q++) {
                var t = board[q];
                t.draw((t.pos[0]+1)*SYS_spriteParams.width, (t.pos[1]+1)*SYS_spriteParams.height);
            }
        },
        
        drawObjects: function() {
            for (var i=0; i<objects.length; i++) {
                var o = objects[i];
                o.draw((o.pos[0]+1)*SYS_spriteParams.width, ((o.pos[1]+1)*SYS_spriteParams.height));
            }
        },
        
        drawEnemies: function() {
            for (var i=0; i<enemies.length; i++) {
                var e = enemies[i];
                e.draw((e.pos[0]+1)*SYS_spriteParams.width, ((e.pos[1]+1)*SYS_spriteParams.height));
            }
        },
        
        drawPlayer: function() {
            player.draw((player.pos[0]+1)*SYS_spriteParams.width, ((player.pos[1]+1)*SYS_spriteParams.height));
        }
    };
};