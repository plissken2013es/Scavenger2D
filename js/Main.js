;(function() {
    var game = function() {
        var time,
            gameState = STATE_INITIALIZATION,
            gameOverFlag = false,
            currentLevel,
            START_LEVEL = 2,
            boardManager = BoardManager(),
            isPlayerTurn = true,
            isPlayerMoving = false,
            isEnemyMoving = false,
            enemiesToMove = [],
            world,
            bufferLoader,
            audioCtx,
            soundInitialized = false,
            soundSources = [
                'audio/scavengers_chop1.mp3',       // 0
                'audio/scavengers_chop2.mp3',       // 1
                'audio/scavengers_die.mp3',         // 2
                'audio/scavengers_enemy1.mp3',      // 3
                'audio/scavengers_enemy2.mp3',      // 4
                'audio/scavengers_footstep1.mp3',   // 5
                'audio/scavengers_footstep2.mp3',   // 6
                'audio/scavengers_fruit1.mp3',      // 7
                'audio/scavengers_fruit2.mp3',      // 8
                'audio/scavengers_music.mp3',       // 9
                'audio/scavengers_soda1.mp3',       // 10
                'audio/scavengers_soda2.mp3',       // 11
            ],
            
            init = function() {
                $("screen").children().remove();  
                if (document.getElementById("score")) {
                    document.getElementById("score").parentNode.removeChild(document.getElementById("score"));
                }
                gameOverFlag = false;
                isPlayerTurn = true;
                isPlayerMoving = false;
                isEnemyMoving = false;
                boardManager = BoardManager();
                
                SYS_process = processor();
                world = boardManager.setupScene(currentLevel, gameCallback);
                draw();
                
                if (!soundInitialized) {
                    initSound();
                }
            },
            
            update = function(dt) {
                SYS_process.process(dt);
            },

            draw = function() {
                boardManager.drawBoard();
                boardManager.drawObjects();
                boardManager.drawEnemies();
                boardManager.drawPlayer();
            }, 
            
            handleKeys = function() {
                isPlayerMoving = true;
                if (keys.left) {
                    world.player.animation("left", world.objects, world.enemies);
                } else if (keys.right) {
                    world.player.animation("right", world.objects, world.enemies);
                } else if (keys.up) {
                    world.player.animation("up", world.objects, world.enemies);
                } else if (keys.down) {
                    world.player.animation("down", world.objects, world.enemies);
                } else {
                    isPlayerMoving = false;
                }
            },
            
            checkCurrentTile = function(pos) {
                for (var i=0; i<world.objects.length; i++) {
                    var obj = world.objects[i];
                    if (obj.pos[0] === world.player.pos[0] && obj.pos[1] === world.player.pos[1]) {
                        currentEnergy += obj.energy;
                        if (obj.energy > FRUIT_ENERGY) {
                            gameSounds.playSound(randomRange(7, 8));
                        } else {
                            gameSounds.playSound(randomRange(10, 11));
                        }
                        world.objects.splice(i, 1);
                        obj.destroy();
                        obj.removed = true;
                        return false;
                    }
                    if (pos[0] === columns-1 && pos[1] === 0) {
                        return true;
                    }
                }
            },
            
            checkGameOver = function() {
                if (currentEnergy <= 0) {
                    gameOver();
                }
            },
            
            initSound = function() {
                if (!audioCtx) {
                    try {
                        window.AudioContext = window.AudioContext||window.webkitAudioContext;
                        audioCtx = new AudioContext();
                    }
                    catch(e) {
                        alert('Web Audio API is not supported in this browser');
                        return;
                    }
                }

                bufferLoader = new BufferLoader(
                    audioCtx,
                    soundSources,
                    finishedLoading
                );

                bufferLoader.load();
            },
            
            finishedLoading = function(bufferList) {
                soundInitialized = true;
                
                gameSounds = SoundManager(audioCtx, bufferList);
                gameSounds.playSound(9); // start music theme
            },
            
            gameOver = function() {
                gameSounds.playSound(2);
                gameOverFlag = true;
                gameState = STATE_GAMEOVER;
            },
            
            gameCallback = function(msg) {
                if (gameOverFlag) {
                    return;
                }
                switch (msg) {
                    case EVT_PLAYER_ENDED_MOVE:
                        currentEnergy--;
                        
                        var isExit = checkCurrentTile(world.player.pos);
                        
                        if (isExit) {
                            isPlayerTurn = true;
                            isPlayerMoving = true;
                            setTimeout(function() {
                                currentLevel++;
                                gameState = STATE_TITLE_SCREEN;
                            }, 1000);
                        } else {                        
                            isPlayerTurn = false;
                            isPlayerMoving = false;
                            enemiesToMove = world.enemies.slice(0);
                        }
                        break;
                    
                    case EVT_ENEMY_ENDED_MOVE:
                        isEnemyMoving = false;
                        break;
                        
                    case EVT_PLAYER_DAMAGE: 
                        currentEnergy -= arguments[1];
                        break;
                        
                    case EVT_WALL_DESTROYED:
                        for (var q=0; q<world.objects.length; q++) {
                            var w = world.objects[q];
                            if (w.type === "wall" && w.removed === true) {
                                world.objects.splice(q, 1);
                                break;
                            }
                        }
                        break;
                }
            },
            
            gameLoop = function() {
                switch (gameState) {
                    case STATE_INITIALIZATION:                            
                        currentEnergy = initialEnergy;
                        currentLevel = START_LEVEL;
                        gameState = STATE_TITLE_SCREEN;
                        break;
                        
                    case STATE_PLAYING:
                        SYS_timeInfo = time.getInfo();
                        
                        if (isPlayerTurn && !isPlayerMoving) {
                            checkGameOver();
                            handleKeys();
                        } else if (!isPlayerTurn && !isEnemyMoving) {
                            var enemy = enemiesToMove.pop();
                            if (enemy) {
                                enemy.decideMovement([world.player], world.objects.concat(world.enemies));
                                isEnemyMoving = true;
                            } else {
                                isPlayerTurn = true;
                            }
                        }
                        
                        update(SYS_timeInfo.elapsed);
                        
                        break;

                    case STATE_TITLE_SCREEN:
                        var title = document.getElementById("title");
                        var screen = document.getElementById("screen");
                        title.innerHTML = "<p>DAY " + currentLevel + "</p>";
                        screen.style.display = "none";
                        title.style.display = "block";
                        gameState = STATE_STANDBY;
                        setTimeout(function() {
                            time = timeInfo(60);
                            init();
                            screen.style.display = "block";
                            title.style.display = "none";
                            gameState = STATE_PLAYING;
                        }, 2500);
                        break;
                        
                    case STATE_STANDBY:
                        break;
                        
                    case STATE_GAMEOVER:
                        var title = document.getElementById("title");
                        var screen = document.getElementById("screen");
                        title.innerHTML = "<p>You died of starvation <br />after " + currentLevel + " days.</p>";
                        screen.style.display = "none";
                        title.style.display = "block";
                        gameState = STATE_STANDBY;
                        setTimeout(function() {
                            time = timeInfo(60);
                            init();
                            gameState = STATE_INITIALIZATION;
                        }, 3500);
                }
                
                requestAnimationFrame(gameLoop);
            };
        
        gameLoop();
    }();
})();