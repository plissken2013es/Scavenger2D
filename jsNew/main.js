var SYS_spriteParams = {
        w: 32,
        h: 32,
        iW: 256,
        img: "sprites/Scavengers_SpriteSheet.png",
        t: $("screen")
    },
    columns = 8, rows = 8,
    floorTiles = [32, 33, 34, 35, 36, 37, 38, 39],
    wallTiles = [25, 26, 27, 28, 29, 30],
    outerWallTiles = [21, 22, 23, 24],
    board = [],
    fuckyou = true;

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

var exitSprite = DHTMLSprite(SYS_spriteParams);
exitSprite.bI(20);
board.push([exitSprite, columns-1, 0]);

function draw(t) {
    t[0].dw((t[1]+1)*SYS_spriteParams.w, (t[2]+1)*SYS_spriteParams.h);
}

board.forEach(draw); // draw Board
$("screen").style.display = "block";