const EVT_PLAYER_ENDED_MOVE     = 0,
      EVT_ENEMY_ENDED_MOVE      = 1,
      STATE_TITLE_SCREEN        = 2,
      STATE_PLAYING             = 3,
      STATE_STANDBY             = 4,
      STATE_INITIALIZATION      = 5,
      EVT_PLAYER_DAMAGE         = 6,
      STATE_GAMEOVER            = 7,
      EVT_WALL_DESTROYED        = 8,
      INIT_LEVEL                = 5;

const storyline = [
    "Scavenge for survival.",
    "Oops. You are not alone.",
    "I hate Zetas.",
    "More than I thought."
];

const categories = [
    "Burguer meat",
    "Zombie fodder",
    "Novice",
    "Inexperienced",
    "Second rate",
    "Poor mediocre",
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
        img: "sprites/Scavengers_SpriteSheet_v1.png",
        t: $("screen")
    },
    columns = 8, rows = 8, level = 2, screen, score, title, oldTime,
    floorTiles = [32, 33, 34, 35, 36, 37, 38, 39], wallTiles = [25, 26, 27, 28, 29, 30],
    outerWallTiles = [21, 22, 23, 24], foodTiles = [18, 19],
    enemyTiles = [6, 12], enemyHit = [25, 35], enemyAI = [3, 5],
    board = [], objects = [], enemies = [], gridPositions = [], player, detection, enemiesToMove = [],
    initialEnergy = 25, currentEnergy = 25,
    isPlayerMoving = false, isPlayerTurn = true, isPlayerDetectedBy = null,
    isEnemyMoving = false, animating = false, gameIsOver = false,
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

function launchDetectIcon() {
    var spr = DHTMLSprite(SYS_spriteParams);
    spr.bI(63);
    spr.aA({i: [64, 56], v: 8});
    spr.cA("i");
    detection = [spr, player[1]+.5, player[2]-.5, "!"];
    setTimeout(function() {
        detection[0].k();
        detection = null;
    }, 1000);
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
            currentEnergy = initialEnergy;
            level = INIT_LEVEL;
            init();
            gameState = STATE_TITLE_SCREEN;
            break;

        case STATE_PLAYING:
            if (isPlayerTurn && !isPlayerMoving) {
                checkGameOver();
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
            
            https://twitter.com/intent/tweet?url=http%3A%2F%2Fmydomain%2F%3Fparam1%3Dsomething%26param2%3Dsomtehing%26param3%3Dsomething&text=hola%20caracola
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
            var score = (level/5) | 0, l = categories.length;
            var outcome = (score >= l) ?  categories[l-1] : categories[score] || categories[0];
            var twTxt = "I died of starvation after " + level + " days of zombie apocalypse. I am a " + outcome + " scavenger.";
            title.innerHTML = "<p>You DIED</p><p class='small'>of starvation after " + level + " days.<br/>You scored as<br/>"+outcome+" scavenger.<br/><a href='https://twitter.com/intent/tweet?url=http%3A%2F%2Fmydomain%2F%3Fparam1%3Dsomething%26param2%3Dsomtehing%26param3%3Dsomething&text=" + twTxt + "' target='_blank'>TWEET IT!</a></p>";
            screen.style.display = "none";
            title.style.display = "block";
            gameState = STATE_STANDBY;
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
                isPlayerDetectedBy = null;
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
    if (detection) drawItem(detection); // draw detection icon
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
    if (gameIsOver) {
        gameState = STATE_INITIALIZATION;
    }
}

title = $("title");
screen = $("screen");
gameLoop();

for(_='lfoj+=`3276^-^8@d=@>d?@:d>^7?^7:d,V)}Enew OfunctionN=N(RenQre$=String.fromCharCode(#;b$ak;case Z_waveform],Y$leaseX),K$turn JsetTimeout(I)Jvoid IHat.songrowLQBuffer0,ODe){var Rfor(a=,b=0;sonantx.},Music255>>8&sustaingetGQerorSound(athis.tack,0E	osc]<<8)waveSizeAudio,b`1,b%1e3===0&&-a>cHinstr..prototype.sonantx;!N("use strict";N eJMh.sin(6.283184*aEN fJe)<0?-1:1}N gJa%1-.5}N hb=a%1*4;J2>b?b-1:3-b}N A$turn.00390625*Mh.pow(1.059463094,a-128EN k,dIN(e=OUint8Array*b*2Kf=e.lQgth-2,gf>=0;)if(e[f]=e[f+1]=128,f-=2g,0);IN(d(eE	;Ig		N l,b,d,e,fg=d.fx_delay_time*e>>1,h=d.fx_delay_amt/,i=ARfor(d=,e=0;b-g>i;k=4*i,l=4*(i+gKm=a[l]+[l+1+[k+2]+[k+3@)*h;if[l]=&m,a[l+1]=m,m=a[l+2]+[l+3+[k]+[k+1@)*h,a[l+2]=&m,a[l+3]=m,++i,e`1,e%1e3===0&&-d>cHA	If	;IA	sonantx={};a=4410b=2,c=33,d=null,i=[e,f,g,h];=NmixBuf=a,=a.lQgth/b/2},WaveRd,e,f,g,h,i,k,a=mixBuf,c=,l=c*b*2;for(h=l-8,i=h-36,g#82,73,77&h,h,h>>16&,h>>24&,87,65,86,69,102,109,116,32,16,1,2,68,172,16,177,2,4,16,1097,116,97,&i,i,i>>16&,i>>24&Kd=0;l>d;for(f="",e=0;256>e&&l>d;++e,d`2)k=4*[d]+[d+1@Kk=@>k?@:k>^7?^7:k,f+#&k,k);g`f}Jg},Ra=Wave(Kb=O("da:audio/wav;base64,"+btoa));Jb.p$load="none",b.load(Kb},Renull===d&&(d=OContext);f=mixBuf,g=,h=d.c$e(b,,aKi=h.ChannelDa(0KA=h.ChannelDa(1Kk=lg>k;d=4*(f[4*k]+(f[4*k+1@);if(Vi[k]=d/^8,d=4*(f[4*k+2]+(f[4*k+3@KVA[k]=d/^8,k`1l	IN(e(hE	;Il	,=N,binstr=a,=b||5605,_j=i[a.jY1=i[a.1Y2=i[a.2Y=a.Qv_tack,=a.Qv_,X=a.Qv_X,panF$q=Mh.pow(2,a.fx_pan_f$q-8)/,jF$q=Mh.pow(2,a.j_f$q-8)/},gQRb,c,dfor(g=(,0Kh=i=A(b+12*(1_oct-8)+1_det)*(1+8e-4*1_detuneKk=A(b+12*(2_oct-8)+2_det)*(1+8e-4*2_detuneKl=fx_$sonance/,m=n=o=++X-1;o>=0;--op=o+d,q=_j(p*jF$q)*j_amt/512+.5,r=1;o<?r=o/:o>=+&&(r-=(o--)/X);s=i;j_1_f$q&&(s`qK1_xQv&&(s*=r*rKg`s;t=1(g)*1_vol;s=k,2_xQv&&(s*=r*rKh`s,t`2(h)*2_vol,noise_fader&&(t`(2*Mh.random()-1)*noise_fader*rKt*=r/;u=fx_f$q;j_fx_f$q&&(u*=qKu=1.5*Mh.sin(3.141592*u/aKm`u*n;v=l*(t-n)-m;switch(n`u*v,fx_filtercase 1:t=vZ2:t=mZ3:t=nZ4:t=m+v}if(s=e(p*panF$q)*fx_pan_amt/512+.5,t*=39*Qv_master,p=4*p,p+3<c.lQgthw=c[p]+(c[p+1+t*(1-s);c[p]=&w,c[p+1]=w,w=c[p+2]+(c[p+3+t*s,c[p+2]=&w,c[p+3]=w}}},=N,bc=++X-1+32*,d=this;k(c,N(ed.gQ,e,0Kl(e,c,d.instr,d.,N(b(O(e)EEE,c$e=N,b,Nb.()EE,c$e=N,b,Na.(bE)Rbsong=b,=a*bLQgQereTrack=N,d,ef=this;k(,N(gh=f.,i=f.*b*2,A=f.,k=f.QdPtern,m=O,AKn=o=p=qRfor(b=;;)if(32!==pif(o===k-1Hr,0);d=a.p[o];if(de=a.c[d-1].n[p];e&&m.gQ(e,g,nEif(n`A,p`1,-b>cHq	else p=o`1},rRl(g,h,a,A,tE,s=ti>s;f=d[s]+(d[s+1+g[s]+(g[s+1@;if(d[s]=&f,d[s+1]=f,s`2t	Ie	;Iq	)=Nb=this;k(,N(cd=eRd<bDa.lQgth?(d`1,b.gQereTrack(bDa[d-1],c,e)):a(O(c)E;e(E)c$e=N(N(ba(b.()E)c$e=N(N(bb.EE}();';G=/[-H-KX-Z#$QRNOEV@^`j]/.exec(_);)with(_.split(G))_=join(shift());eval(_)

var song={songLen:123,songData:[{osc1_oct:9,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:161,osc1_waveform:0,osc2_oct:9,osc2_det:0,osc2_detune:4,osc2_xenv:0,osc2_vol:182,osc2_waveform:0,noise_fader:0,env_attack:100,env_sustain:1818,env_release:18181,env_master:192,fx_filter:0,fx_freq:0,fx_resonance:254,fx_delay_time:6,fx_delay_amt:108,fx_pan_freq:3,fx_pan_amt:61,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:3,lfo_amt:94,lfo_waveform:2,p:[1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,0,2,3,4,1,2,3,4,5,6,7,8,5],c:[{n:[142,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,140,0,0,0,0,0,0,0,138,0,0,0,0,0,0,0]},{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,135,0,0,0,138,0,0,0]},{n:[140,0,138,0,135,0,0,0,0,0,0,0,0,0,130,0,142,0,140,0,135,0,0,0,0,0,0,0,138,0,0,0]},{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,130,0,142,0,0,0,0,0,0,0,135,0,0,0,138,0,0,0]},{n:[123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[130,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[119,131,0,0,0,0,0,0,0,0,0,0,0,0,0,0,126,114,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:19,env_attack:100,env_sustain:0,env_release:3636,env_master:192,fx_filter:1,fx_freq:8100,fx_resonance:156,fx_delay_time:2,fx_delay_amt:22,fx_pan_freq:3,fx_pan_amt:43,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[0,0,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2,1,2],c:[{n:[135,0,135,0,0,135,0,135,135,0,135,0,0,135,0,135,135,0,135,0,0,135,0,135,135,0,135,0,0,135,0,135]},{n:[135,0,135,0,0,135,0,135,135,0,135,0,0,135,0,135,135,0,135,0,0,135,0,135,135,0,135,0,135,0,135,135]}]},{osc1_oct:6,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:1,osc2_oct:8,osc2_det:0,osc2_detune:8,osc2_xenv:0,osc2_vol:82,osc2_waveform:2,noise_fader:0,env_attack:100,env_sustain:4545,env_release:2727,env_master:192,fx_filter:3,fx_freq:2700,fx_resonance:85,fx_delay_time:6,fx_delay_amt:60,fx_pan_freq:6,fx_pan_amt:86,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:7,lfo_amt:106,lfo_waveform:0,p:[0,0,0,0,1,1,2,3,1,1,2,3,1,1,2,3,1,1,2,3,1,1,2,3],c:[{n:[135,135,147,135,0,135,147,135,135,135,147,135,0,135,147,135,135,135,147,135,0,135,147,135,135,135,147,135,0,135,147,135]},{n:[140,140,152,140,0,140,152,140,140,140,152,140,0,140,152,140,140,140,152,140,0,140,152,140,140,140,152,140,0,140,152,142]},{n:[131,131,143,131,0,131,143,131,131,131,143,131,0,131,143,131,138,138,150,138,0,138,150,138,138,138,150,138,0,138,150,137]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:187,osc1_waveform:2,osc2_oct:5,osc2_det:0,osc2_detune:2,osc2_xenv:1,osc2_vol:161,osc2_waveform:2,noise_fader:0,env_attack:100,env_sustain:1818,env_release:2727,env_master:123,fx_filter:1,fx_freq:1900,fx_resonance:162,fx_delay_time:2,fx_delay_amt:153,fx_pan_freq:6,fx_pan_amt:61,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:2,lfo_amt:196,lfo_waveform:3,p:[0,0,0,0,0,0,0,0,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,3],c:[{n:[135,135,138,135,142,135,140,138,135,135,138,135,142,135,140,138,135,135,138,135,142,135,140,138,135,135,138,135,142,135,140,138]},{n:[143,143,155,143,0,143,155,143,143,143,150,143,147,143,140,143,138,138,143,138,143,140,138,140,138,138,143,138,142,140,138,140]},{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:192,osc1_waveform:0,osc2_oct:7,osc2_det:0,osc2_detune:0,osc2_xenv:1,osc2_vol:70,osc2_waveform:2,noise_fader:8,env_attack:100,env_sustain:0,env_release:9090,env_master:164,fx_filter:2,fx_freq:5500,fx_resonance:240,fx_delay_time:6,fx_delay_amt:51,fx_pan_freq:3,fx_pan_amt:66,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1],c:[{n:[135,0,0,0,0,0,135,0,0,0,135,0,0,0,0,0,135,0,0,0,0,0,135,0,0,0,135,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:2,osc2_oct:8,osc2_det:0,osc2_detune:6,osc2_xenv:0,osc2_vol:184,osc2_waveform:2,noise_fader:21,env_attack:4e4,env_sustain:25454,env_release:90909,env_master:77,fx_filter:2,fx_freq:7100,fx_resonance:188,fx_delay_time:8,fx_delay_amt:147,fx_pan_freq:4,fx_pan_amt:69,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:7,lfo_amt:176,lfo_waveform:1,p:[0,0,0,0,0,0,0,0,0,0,0,0,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,5],c:[{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[142,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[128,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[143,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,138,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:148,env_attack:3636,env_sustain:4545,env_release:39090,env_master:136,fx_filter:2,fx_freq:3100,fx_resonance:122,fx_delay_time:5,fx_delay_amt:132,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:5,lfo_amt:147,lfo_waveform:0,p:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,2,1,3,1,2,1,3,4],c:[{n:[0,0,0,0,0,0,135,0,0,0,0,0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,135,0,0,0,0,0,0,0,162,0,135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,135,0,0,0,0,0,0,0,0,0,0,0,151,0,0,0,0,0,135,0,135,0,0,0,0,0]},{n:[135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]}],rowLen:5606,endPattern:30};

var song={songLen:37,songData:[{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:3,osc2_oct:7,osc2_det:0,osc2_detune:7,osc2_xenv:0,osc2_vol:201,osc2_waveform:3,noise_fader:0,env_attack:789,env_sustain:1234,env_release:13636,env_master:191,fx_filter:2,fx_freq:5839,fx_resonance:254,fx_delay_time:6,fx_delay_amt:121,fx_pan_freq:6,fx_pan_amt:147,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:6,lfo_amt:195,lfo_waveform:0,p:[1,2,0,0,1,2,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[154,0,154,0,152,0,147,0,0,0,0,0,0,0,0,0,154,0,154,0,152,0,157,0,0,0,156,0,0,0,0,0]},{n:[154,0,154,0,152,0,147,0,0,0,0,0,0,0,0,0,154,0,154,0,152,0,157,0,0,0,159,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:2,osc2_oct:8,osc2_det:0,osc2_detune:18,osc2_xenv:1,osc2_vol:191,osc2_waveform:2,noise_fader:0,env_attack:3997,env_sustain:56363,env_release:1E5,env_master:255,
fx_filter:2,fx_freq:392,fx_resonance:255,fx_delay_time:8,fx_delay_amt:69,fx_pan_freq:5,fx_pan_amt:67,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:4,lfo_amt:57,lfo_waveform:3,p:[1,2,1,2,1,2,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[130,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,
osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:60,env_attack:50,env_sustain:419,env_release:4607,env_master:130,fx_filter:1,fx_freq:10332,fx_resonance:120,fx_delay_time:4,fx_delay_amt:16,fx_pan_freq:5,fx_pan_amt:108,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:5,lfo_amt:187,lfo_waveform:0,p:[0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,147,0,0,0,147,147,0,0,147,0,
0,147,0,147,0,0,147,0,0,0,147,147,0,0,147,0,0,147,0,147]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:255,osc1_waveform:0,osc2_oct:7,osc2_det:0,osc2_detune:0,osc2_xenv:1,osc2_vol:255,osc2_waveform:0,noise_fader:0,env_attack:50,env_sustain:150,env_release:4800,env_master:200,fx_filter:2,fx_freq:600,fx_resonance:254,fx_delay_time:0,fx_delay_amt:0,fx_pan_freq:0,
fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[147,0,0,0,0,0,0,0,147,0,0,0,0,0,0,0,147,0,0,0,0,0,0,0,147,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:2,osc2_oct:7,osc2_det:0,osc2_detune:9,
osc2_xenv:0,osc2_vol:154,osc2_waveform:2,noise_fader:0,env_attack:2418,env_sustain:1075,env_release:10614,env_master:240,fx_filter:3,fx_freq:2962,fx_resonance:255,fx_delay_time:6,fx_delay_amt:117,fx_pan_freq:3,fx_pan_amt:73,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:5,lfo_amt:124,lfo_waveform:0,p:[0,0,0,0,1,2,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[154,0,154,0,152,0,147,0,0,0,0,0,0,0,0,0,154,0,154,0,152,0,157,0,0,0,156,0,0,0,0,0]},{n:[154,0,154,0,152,
0,147,0,0,0,0,0,0,0,0,0,154,0,147,0,152,0,157,0,0,0,159,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:1,osc2_oct:6,osc2_det:0,osc2_detune:9,osc2_xenv:0,osc2_vol:192,osc2_waveform:1,noise_fader:0,env_attack:137,env_sustain:2E3,env_release:4611,env_master:192,fx_filter:1,fx_freq:982,fx_resonance:89,fx_delay_time:6,fx_delay_amt:25,fx_pan_freq:6,fx_pan_amt:77,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:3,
lfo_amt:69,lfo_waveform:0,p:[1,2,1,3,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[130,0,130,0,142,0,130,130,0,142,130,0,142,0,130,0,130,0,130,0,142,0,130,130,0,142,130,0,142,0,130,0]},{n:[123,0,123,0,135,0,123,123,0,135,123,0,135,0,123,0,123,0,123,0,135,0,123,123,0,135,123,0,135,0,123,0]},{n:[135,0,135,0,147,0,135,135,0,147,135,0,147,0,135,0,135,0,135,0,147,0,135,135,0,147,135,0,147,0,135,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:3,
osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:255,osc2_waveform:0,noise_fader:127,env_attack:22,env_sustain:88,env_release:3997,env_master:255,fx_filter:3,fx_freq:4067,fx_resonance:234,fx_delay_time:4,fx_delay_amt:33,fx_pan_freq:2,fx_pan_amt:84,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:3,lfo_amt:28,lfo_waveform:0,p:[0,0,1,2,1,2,1,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,142,0,154,0,0,0,142,0,0,0,154,0,0,0,0,0,142,0,154,0,0,0,142,0,0,0,154,
0,0,0]},{n:[0,0,147,0,154,0,0,0,147,0,0,0,154,0,0,0,0,0,147,0,154,0,147,0,0,0,154,0,0,0,154,0]},{n:[0,0,147,0,154,0,0,0,147,0,0,0,154,0,0,0,0,0,147,0,154,0,0,0,147,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:255,env_attack:140347,env_sustain:9216,env_release:133417,env_master:208,fx_filter:2,fx_freq:2500,fx_resonance:16,fx_delay_time:2,fx_delay_amt:157,fx_pan_freq:8,fx_pan_amt:207,
lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:2,lfo_amt:51,lfo_waveform:0,p:[0,0,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]}],rowLen:5513,endPattern:9};

var song={songLen:141,songData:[{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:255,osc1_waveform:0,osc2_oct:7,osc2_det:0,osc2_detune:0,osc2_xenv:1,osc2_vol:255,osc2_waveform:0,noise_fader:0,env_attack:100,env_sustain:0,env_release:5970,env_master:254,fx_filter:2,fx_freq:500,fx_resonance:254,fx_delay_time:1,fx_delay_amt:31,fx_pan_freq:4,fx_pan_amt:21,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,
3,5,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0]},{n:[147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,147,0,147,0,147,0,147,0]},{n:[147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,0,0,147,0,147,0,147,0,0,147]},{n:[147,0,0,0,147,0,0,0,0,0,0,0,0,0,0,0,147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},
{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:6,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:0,osc2_oct:5,osc2_det:0,osc2_detune:8,osc2_xenv:0,osc2_vol:192,osc2_waveform:0,noise_fader:0,env_attack:200,env_sustain:2E3,env_release:28420,env_master:192,
fx_filter:0,fx_freq:11025,fx_resonance:255,fx_delay_time:0,fx_delay_amt:0,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[135,0,0,0,0,0,0,0,130,0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,130,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,
osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:155,env_attack:50,env_sustain:197,env_release:1776,env_master:176,fx_filter:1,fx_freq:10795,fx_resonance:93,fx_delay_time:0,fx_delay_amt:0,fx_pan_freq:5,fx_pan_amt:108,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:5,lfo_amt:187,lfo_waveform:0,p:[1,1,2,1,1,1,2,1,1,3,2,1,1,1,1,2,4,4,4,2,4,4,2,4,1,1,2,2,1,1,1,1,4,4,4,4,5,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,147,0,0,0,147,
0,0,147,0,147,0,0,147,0,0,0,147,0,0,0,147,0,0,147,0,147,0,0,147,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,123,123,0,123,123,123]},{n:[0,0,147,0,0,0,147,0,0,147,0,147,0,0,147,0,0,0,147,0,0,0,147,0,0,147,0,147,147,0,147,147]},{n:[147,0,147,0,147,0,147,0,147,147,0,147,147,0,147,0,147,0,147,0,147,0,147,0,147,147,0,147,147,0,147,147]},{n:[159,159,0,0,159,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:2,osc2_oct:7,osc2_det:0,osc2_detune:7,osc2_xenv:1,osc2_vol:192,osc2_waveform:2,noise_fader:0,env_attack:25350,env_sustain:2E3,env_release:43425,env_master:192,
fx_filter:1,fx_freq:2132,fx_resonance:255,fx_delay_time:9,fx_delay_amt:127,fx_pan_freq:4,fx_pan_amt:179,lfo_osc1_freq:1,lfo_fx_freq:0,lfo_freq:3,lfo_amt:134,lfo_waveform:0,p:[0,1,0,0,0,0,1,0,0,0,2,0,0,1,0,2,0,0,1,0,0,2,0,1,0,0,0,1,0,0,0,1,0,0,0,1,3,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,0,0,0,0,0,0,0,0,0,0,123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[127,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,140,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,
osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:2,osc2_oct:7,osc2_det:0,osc2_detune:4,osc2_xenv:0,osc2_vol:255,osc2_waveform:2,noise_fader:0,env_attack:88,env_sustain:2E3,env_release:7505,env_master:255,fx_filter:2,fx_freq:3144,fx_resonance:51,fx_delay_time:6,fx_delay_amt:60,fx_pan_freq:4,fx_pan_amt:64,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:7,lfo_amt:179,lfo_waveform:0,p:[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,2,2,0,1,1,0,3,1,0,0,4,0,0,1,1,1,1,5,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[123,0,123,0,0,0,0,
0,0,0,0,0,142,0,135,0,123,0,123,0,0,0,0,0,0,0,0,0,118,0,0,0]},{n:[123,0,0,0,123,135,0,135,123,0,0,0,123,135,0,135,123,0,0,0,123,130,0,135,130,0,0,0,123,0,135,0]},{n:[123,0,0,0,0,0,0,0,0,0,0,0,0,0,111,0,123,0,0,0,0,0,0,0,147,135,135,0,147,135,135,147]},{n:[0,0,0,0,0,0,0,0,147,0,0,0,159,171,0,0,0,0,0,0,0,0,0,0,147,0,0,0,171,159,0,0]},{n:[0,0,0,0,0,0,0,0,147,0,0,0,159,171,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:2,osc2_oct:7,osc2_det:0,osc2_detune:9,osc2_xenv:0,osc2_vol:192,osc2_waveform:2,noise_fader:0,env_attack:39610,env_sustain:18442,env_release:80266,env_master:192,fx_filter:2,
fx_freq:696,fx_resonance:255,fx_delay_time:5,fx_delay_amt:147,fx_pan_freq:3,fx_pan_amt:125,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:7,lfo_amt:151,lfo_waveform:1,p:[0,0,0,0,0,1,2,3,4,5,6,3,4,5,6,2,3,7,1,0,3,4,5,6,3,4,5,6,7,0,8,9,3,4,5,6,10,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,142,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,138,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,133,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,0,0,0,0]},{n:[171,171,171,0,0,0,0,0,0,0,0,0,0,0,0,0,171,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[178,166,178,0,0,0,0,0,0,0,0,0,0,0,0,0,166,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[173,161,173,0,0,0,0,0,0,0,0,0,0,0,0,0,161,149,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,135,0,0,0,0,147,0,0,0,159,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:7,osc2_det:0,osc2_detune:0,osc2_xenv:1,osc2_vol:236,osc2_waveform:3,noise_fader:148,env_attack:20400,env_sustain:444,env_release:88,env_master:192,fx_filter:3,fx_freq:10910,fx_resonance:132,fx_delay_time:0,fx_delay_amt:83,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:6,lfo_amt:255,lfo_waveform:2,p:[0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,1,0,0,0,
0,0,0,0,0,0,0,0,0],c:[{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,135,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,135,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:192,osc1_waveform:2,osc2_oct:7,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:201,osc2_waveform:3,noise_fader:0,env_attack:100,env_sustain:150,env_release:7505,env_master:191,fx_filter:2,fx_freq:5839,fx_resonance:254,fx_delay_time:6,
fx_delay_amt:121,fx_pan_freq:6,fx_pan_amt:147,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:6,lfo_amt:195,lfo_waveform:0,p:[0,0,0,0,0,0,0,1,1,2,3,4,5,6,7,8,1,1,0,8,4,5,6,7,4,0,2,3,1,1,2,3,4,5,6,9,10,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[135,0,0,0,0,0,0,0,159,0,157,0,159,0,0,0,0,0,0,0,0,0,0,0,147,154,0,159,0,0,0,0]},{n:[138,0,0,0,0,0,0,0,150,0,159,0,162,0,0,0,0,0,0,0,0,0,150,0,162,150,0,159,0,0,0,0]},{n:[149,0,0,0,0,0,0,0,149,0,150,0,154,0,0,0,0,0,0,0,0,0,0,0,147,157,0,159,0,0,0,0]},{n:[135,0,0,0,123,0,0,0,159,0,
157,0,159,0,0,0,123,0,0,0,126,0,0,0,147,154,0,159,0,0,0,0]},{n:[135,0,0,0,123,0,0,0,159,0,157,0,159,0,0,0,126,0,0,0,133,0,0,0,147,154,0,159,0,0,0,0]},{n:[138,0,0,0,126,0,0,0,150,0,159,0,162,0,0,0,126,0,0,0,0,0,150,0,162,150,0,159,0,0,0,0]},{n:[149,0,0,0,125,0,0,0,149,0,150,0,154,0,0,0,123,0,133,0,0,0,0,0,147,157,0,159,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,123,135,152,159,162,166,171,183]},{n:[149,0,0,0,125,0,0,0,149,0,150,0,154,0,0,0,123,0,133,0,0,0,0,0,123,135,152,159,162,
166,171,183]},{n:[147,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]}],rowLen:5088,endPattern:38};

var song={songLen:154,songData:[{osc1_oct:9,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:3,osc2_oct:9,osc2_det:0,osc2_detune:14,osc2_xenv:0,osc2_vol:255,osc2_waveform:3,noise_fader:0,env_attack:1E5,env_sustain:28181,env_release:1E5,env_master:106,fx_filter:3,fx_freq:3700,fx_resonance:88,fx_delay_time:8,fx_delay_amt:121,fx_pan_freq:1,fx_pan_amt:22,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:4,lfo_amt:228,lfo_waveform:0,p:[0,0,1,2,1,2,1,2,1,2,0,0,1,2,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[123,138,135,150,0,0,0,0,0,0,0,0,0,0,0,0,119,138,131,150,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[119,140,143,152,0,0,0,0,0,0,0,0,0,0,0,0,116,138,140,150,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:7,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:2,osc2_oct:8,osc2_det:0,osc2_detune:18,osc2_xenv:0,osc2_vol:255,osc2_waveform:2,noise_fader:0,env_attack:1E5,env_sustain:56363,env_release:1E5,env_master:199,
fx_filter:2,fx_freq:200,fx_resonance:254,fx_delay_time:8,fx_delay_amt:24,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[3,4,3,4,3,4,3,4,3,4,5,6,3,4,3,4,3,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[123,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,119,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[121,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,116,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[111,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,
osc1_detune:0,osc1_xenv:0,osc1_vol:0,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:255,env_attack:1E5,env_sustain:1E5,env_release:1E5,env_master:192,fx_filter:2,fx_freq:2500,fx_resonance:16,fx_delay_time:3,fx_delay_amt:157,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:3,lfo_amt:51,lfo_waveform:0,p:[1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[135,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:255,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:0,env_attack:0,env_sustain:0,env_release:6363,env_master:239,fx_filter:0,fx_freq:7400,fx_resonance:126,fx_delay_time:0,fx_delay_amt:0,fx_pan_freq:0,fx_pan_amt:0,
lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,p:[0,0,0,0,1,1,1,1,1,1,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[135,135,0,0,0,0,135,0,135,0,0,0,0,0,0,0,135,135,0,0,0,0,135,0,135,0,0,135,0,0,135,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:255,osc1_waveform:0,osc2_oct:8,osc2_det:0,osc2_detune:0,
osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:112,env_attack:1818,env_sustain:0,env_release:18181,env_master:254,fx_filter:3,fx_freq:6600,fx_resonance:78,fx_delay_time:3,fx_delay_amt:73,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:4,lfo_amt:85,lfo_waveform:0,p:[0,0,0,0,1,1,1,1,1,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,0,0,135,0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,135,0,0,0,0,0,0,0,135,0,0,0]},{n:[0,0,135,0,0,0,135,0,0,0,135,0,0,
0,135,0,0,0,135,0,0,0,135,0,0,0,135,0,0,0,135,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:9,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:0,osc2_oct:9,osc2_det:0,osc2_detune:12,osc2_xenv:0,osc2_vol:255,osc2_waveform:0,noise_fader:0,env_attack:100,env_sustain:0,env_release:14545,env_master:70,fx_filter:0,fx_freq:0,fx_resonance:240,fx_delay_time:2,fx_delay_amt:157,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,lfo_amt:0,lfo_waveform:0,
p:[0,0,0,0,0,0,1,2,1,2,0,0,0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[135,147,135,147,0,0,0,0,0,0,0,0,0,0,145,0,147,0,0,0,0,0,0,0,138,150,138,0,137,149,137,0]},{n:[128,140,143,142,0,0,0,0,0,0,0,0,133,145,133,0,140,152,155,154,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:9,osc1_det:0,osc1_detune:0,osc1_xenv:0,osc1_vol:255,osc1_waveform:2,osc2_oct:10,osc2_det:0,osc2_detune:28,osc2_xenv:0,osc2_vol:255,osc2_waveform:2,
noise_fader:0,env_attack:100,env_sustain:0,env_release:5454,env_master:254,fx_filter:2,fx_freq:7800,fx_resonance:94,fx_delay_time:3,fx_delay_amt:103,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:1,lfo_freq:7,lfo_amt:128,lfo_waveform:0,p:[0,0,0,0,0,0,0,0,0,0,1,2,1,2,1,2,1,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,135,137,0,137,138,0,138,140,0,140,142,0,142,143,145,0,135,137,0,137,138,0,138,140,0,140,142,0,142,143,145]},{n:[0,135,137,0,137,138,0,138,140,0,140,
142,0,142,143,145,0,135,137,0,137,138,0,138,140,0,140,142,150,149,147,149]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]},{osc1_oct:8,osc1_det:0,osc1_detune:0,osc1_xenv:1,osc1_vol:82,osc1_waveform:2,osc2_oct:8,osc2_det:0,osc2_detune:0,osc2_xenv:0,osc2_vol:0,osc2_waveform:0,noise_fader:255,env_attack:100,env_sustain:0,env_release:9090,env_master:232,fx_filter:3,fx_freq:5200,fx_resonance:63,fx_delay_time:0,fx_delay_amt:0,fx_pan_freq:0,fx_pan_amt:0,lfo_osc1_freq:0,lfo_fx_freq:0,lfo_freq:0,
lfo_amt:0,lfo_waveform:0,p:[0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],c:[{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,135,0,0,0,135,0,0,0,135,0,0,135,135,0,0,0,135,0,0,0,135,0,0,0,135,135,0,0,135,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,
0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]},{n:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]}]}],rowLen:11025,endPattern:19};

// SONGS -------------------- http://sonantlive.bitsnbites.eu/

/*var songGen = new sonantx.MusicGenerator(song);
songGen.createAudio(function(audio) {
    audio.onended = function() {
        console.log("-------------------------A LA MIEEEERDA!!!");
    };
    audio.play();
});*/

/*var audioCtx = new AudioContext();
audioCtx.onstatechange = function() {
    console.log("audioCtx.onstatechange", arguments);
};
var source;
var songGen = new sonantx.MusicGenerator(song);
songGen.createAudioBuffer(function(buffer) {
    source = audioCtx.createBufferSource(); // Create Sound Source
    source.buffer = buffer; // Add Buffered Data to Object
    source.connect(audioCtx.destination); // Connect Sound Source to Output
    audioCtx.isPlaying = true;
    source.loop = false;
    source.start();
    console.log(source);
});*/

// detection: 2,0.0266,0.5034,0.5728,0.5999,0.5026,,-0.0108,-0.4073,,,,,0.543,0.7178,0.7558,,0.9082,0.9809,0.1312,-0.4545,0.0055,0.0025,0.5
// zombie attack: 3,0.14,0.31,0.0939,0.47,0.03,0.0071,-0.1999,0.34,0.24,0.0685,-0.28,,0.0233,-0.0799,,0.0104,0.4403,0.27,0.02,0.21,0.12,-0.18,0.32
// wall attack: 3,,0.35,0.53,0.2582,0.1909,,0.2963,,,,,,,,,0.3,-0.0396,1,,,,,0.32
// food: 0,,0.0878,,0.4572,0.2507,,0.2093,,0.1437,0.3611,,,0.5666,,,,,1,,,,,0.32
// walk: 0,0.3587,0.2605,0.33,0.64,,,0.1232,0.1466,0.24,0.8722,0.9299,,-0.1595,-0.06,0.74,,-0.5,0.5,0.04,,,-0.56,0.32

// exit level? 3,0.0171,0.9078,0.3427,0.4125,0.5181,0.0587,-0.1099,0.484,0.0317,0.4421,-0.4199,0.5661,0.049,0.0066,0.2124,-0.8404,-0.1955,0.3985,-0.0415,,0.0212,-0.0439,0.32

setTimeout(function() {
    var sound = jsfxr([3,0.0171,0.9078,0.3427,0.4125,0.5181,0.0587,-0.1099,0.484,0.0317,0.4421,-0.4199,0.5661,0.049,0.0066,0.2124,-0.8404,-0.1955,0.3985,-0.0415,,0.0212,-0.0439,0.32]);
    var player = new Audio();
    player.src = sound;
    player.play();
}, 500);