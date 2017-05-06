var SYS_spriteParams = {
        width: 32,
        height: 32,
        imagesWidth: 256,
        images: "sprites/Scavengers_SpriteSheet.png",
        $drawTarget: $("#screen")
    },
    SYS_process,
    SYS_collisionManager,
    SYS_timeInfo,
    columns = 8, rows = 8,
    initialEnergy = 25,
    currentEnergy,
    gameSounds,
    FRUIT_ENERGY = 15,
    SODA_ENERGY = 30;

const EVT_PLAYER_ENDED_MOVE     = 0,
      EVT_ENEMY_ENDED_MOVE      = 1,
      STATE_TITLE_SCREEN        = 2,
      STATE_PLAYING             = 3,
      STATE_STANDBY             = 4,
      STATE_INITIALIZATION      = 5,
      EVT_PLAYER_DAMAGE         = 6,
      STATE_GAMEOVER            = 7,
      EVT_WALL_DESTROYED        = 8;