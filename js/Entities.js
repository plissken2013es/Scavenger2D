// Contains the Tile sprite, position and maybe other data
var Tile = function(sprite, pos, gameCallback) {
    var that = sprite;
    that.pos = pos;
    that.type = "tile",
    that.energy = 2,
        
    that.damage = function() {
        that.energy --;
        if (that.energy === 1) that.changeImage(that.index() + 31);
        if (that.energy <= 0) {
            that.removed = true;
            that.destroy();
            gameCallback(EVT_WALL_DESTROYED);
        }
    };
    
    return that;
};

// Contains the Entity sprites, animations, position and maybe other data
var Entity = function(sprite, pos, anims, gameCallback) {
    var that = sprite,
        imageIndex = 0,
        footStepIndex = 0,
        speed = anims.animationSpeed || 5,
        animationTimeout = anims.animationTimeout || 200,
        x, y,
        diffX, diffY,
        animating = false;
    
    that.pos = pos;
    that.anims = anims;
    that.currentAnim = that.anims["idle"];

    that.move = function(dt) {
        that.changeImage(that.index() + that.currentAnim[Math.floor(imageIndex)]);
        imageIndex += dt/1000 * that.anims.velocity;
        if (imageIndex >= that.currentAnim.length) {
            imageIndex = 0;
        }
        
        if (animating) {
            x += diffX*dt/1000;
            y += diffY*dt/1000;
            that.draw(x, y);
        }
    };
    
    that.attemptMove = function(action, obstacles, enemies) {
        var destX = pos[0];
        if (action === "right") {
            destX++;
        }
        if (action === "left") {
            destX--;
        }
        var destY = pos[1];
        if (action === "up") {
            destY--;
        }
        if (action === "down") {
            destY++;
        }
        
        for (var i=0; i<enemies.length; i++) {
            if (enemies[i].pos[0] === destX && enemies[i].pos[1] === destY && enemies[i].type !== "food") {
                return "cantmove";
            }
        }
        for (var i=0; i<obstacles.length; i++) {
            if (obstacles[i].pos[0] === destX && obstacles[i].pos[1] === destY) {
                return obstacles[i];
            }
        }
        gameSounds.playSound(randomRange(5, 6)); // footsteps
        return "move";
    };
    
    that.decideMovement = function(player, obstacles) {
        var options = ["left", "right", "up", "down"];
        var distanceToPlayer = Math.abs(that.pos[0] - player[0].pos[0]) + Math.abs(that.pos[1] - player[0].pos[1]);
        var decision = "";       
        
        if (distanceToPlayer <= that.view_range) {
            if (that.pos[1] > player[0].pos[1]) {
                decision = "up";
            } else if (that.pos[1] < player[0].pos[1]) {
                decision = "down";
            } 
            if (decision === "") {
                if (that.pos[0] > player[0].pos[0]) {
                    decision = "left";
                } else if (that.pos[0] < player[0].pos[0]) {
                    decision = "right";
                }
            }
        } else { // random decision
            decision = options[randomRange(0, options.length)];
        }
        console.log(that.pos, decision);
        
        that.doAnimate(decision, player, obstacles);
        
        setTimeout(function() {
            x = (that.pos[0]+1)*SYS_spriteParams.width;
            y = (that.pos[1]+1)*SYS_spriteParams.height;
            that.draw(x, y);
            animating = false;
            gameCallback(EVT_ENEMY_ENDED_MOVE);
        }, animationTimeout);
    };
    
    that.doAnimate = function(action, obstacles, enemies) {
        x = (that.pos[0]+1)*SYS_spriteParams.width;
        y = (that.pos[1]+1)*SYS_spriteParams.height;
        diffX = diffY = 0;
        animating = true;
        
        var moveAttempt = that.attemptMove(action, obstacles, enemies);
        if (moveAttempt === "cantmove") {
            return;
        } else if (moveAttempt.type === "wall" || moveAttempt.type === "player") {
            if (moveAttempt.type === "player") {
                moveAttempt.changeAnimation("damage");
                gameCallback(EVT_PLAYER_DAMAGE, that.hitPoints);
                
                gameSounds.playSound(randomRange(3, 4)); // zombie attack sound
                
                var idleDmg = setTimeout(function() {
                    moveAttempt.changeAnimation("idle");
                }, 500);
            }
            if (moveAttempt.type === "wall" && that.type === "player") {
                moveAttempt.damage();
                gameSounds.playSound(randomRange(0, 1));  // player chop sound
            }
            that.changeAnimation("attack");
            var idleAtk = setTimeout(function() {
                that.changeAnimation("idle");
            }, 500);
            return;
        }
        
        switch (action) {
            case "left":
                if (that.pos[0] > 0) {
                    that.pos[0]--;
                    diffX = -SYS_spriteParams.width * speed;
                }
                break;
            case "right":
                if (that.pos[0] < columns-1) {
                    that.pos[0]++;
                    diffX = SYS_spriteParams.width * speed;
                }
                break;
            case "up":
                if (that.pos[1] > 0) {
                    that.pos[1]--;
                    diffY = -SYS_spriteParams.height * speed;
                }
                break;
            case "down":
                if (that.pos[1] < rows-1) {
                    that.pos[1]++;
                    diffY = SYS_spriteParams.height * speed;
                }
                break;
        }
    }
    
    that.animation = function(action, obstacles, enemies) {
        that.doAnimate(action, obstacles, enemies);
        
        setTimeout(function() {
            x = (that.pos[0]+1)*SYS_spriteParams.width;
            y = (that.pos[1]+1)*SYS_spriteParams.height;
            that.draw(x, y);
            animating = false;
            gameCallback(EVT_PLAYER_ENDED_MOVE);
        }, animationTimeout);
    };
    
    SYS_process.add(that);
    
    return that;
};