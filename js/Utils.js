function randomRange(min, max) {
    return Math.floor(Math.random() * (max-min)) + min;
}

var timeInfo = function (goalFPS) {
    var oldTime, paused = true,
        iterCount = 0,
        totalFPS = 0,
        totalCoeff = 0;
    return {
        getInfo: function () {

            if (paused === true) {
                paused = false;
                oldTime = +new Date();
                return {
                    elapsed: 0,
                    coeff: 0,
                    FPS: 0,
                    averageFPS: 0
                };
            }

            var newTime = +new Date();
            var elapsed = newTime - oldTime;
            oldTime = newTime;
            var FPS = 1000 / elapsed;
            iterCount++;
            totalFPS += FPS;

            var coeff = goalFPS / FPS;
            totalCoeff += coeff;


            return {
                elapsed: elapsed,
                coeff: coeff,
                FPS: FPS,
                averageFPS: totalFPS / iterCount,
                averageCoeff: totalCoeff / iterCount
            };
        },
        pause: function () {
            paused = true;
        }
    };
};

var processor = function() {
    var processList = [],
        addedItems = [];
    
    return {
        add: function(process) {
            addedItems.push(process);
        },
        
        process: function(dt) {
            var newProcessList = [],
                len = processList.length;
            for (var i=0; i<len; i++) {
                if (!processList[i].removed) {
                    processList[i].move(dt);
                    newProcessList.push(processList[i]);
                }
            }
            processList = newProcessList.concat(addedItems);
            addedItems = [];
        }
    };
};

var keys = function() {
    var keyMap = {
        "37": "left",
        "39": "right",
        "38": "up",
        "40": "down",
        "9":  "tab"
    },
    kInfo = {
        "left": 0,
        "right": 0,
        "up": 0,
        "down": 0,
        "tab":  0
    },
    key;
    
    $(document).bind("keydown keyup", function(event) {
        event.preventDefault();
        key = "" + event.which;
        if (keyMap[key] !== undefined) {
            kInfo[keyMap[key]] = event.type === "keydown" ? 1 : 0;
            return false;
        }
    });
    
    return kInfo;
}();

var SoundManager = function(audioCtx, bufferList) {
    var sounds = {},
        audioCtx = audioCtx,
        bufferList = bufferList;
    
        var that = {
            playSound: function(which) {
                var src = audioCtx.createBufferSource();
                src.buffer = bufferList[which];
                var gainNode = audioCtx.createGain();
                src.connect(gainNode);
                gainNode.gain.value = 0.25;
                if (which === 5 || which === 6) {
                    gainNode.gain.value = 0.05;
                }
                if (which === 9) {
                    src.loop = true;
                }
                gainNode.connect(audioCtx.destination);
                src.start(0);
            }
        };
    
    return that;
};