const socket = io();
const DIRECTION = {
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyW': 'up',
    'KeyS': 'down',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'up',
    'ArrowDown': 'down',
    'Space': 'shoot'
}
const STATE = {
    'left': false,
    'right': false,
    'up': false,
    'down': false
}
const PLAYER_OFFSET = {};
const BOMP_OFFSET = {};
const MINCOUNT = 10;
const HP_WIDTH = 40;
const HP_HEIGHT = 5;
const BULLET_BAR_W = 10;
const BULLET_BAR_H = 5;
const BULLET_BAR_SPACING = 2;

const App = ()=>{
    const canvas = document.getElementById('cvs');
    const canvas_w = 500;
    const canvas_h = 500;
    const ctx = canvas.getContext('2d');

    socket.on('connected', OnConnected);
    socket.on('disconnected', OnDisconnected);
    socket.on('update', Update);

    // ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    function Update(data){
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        for(const player of data.update.players){
            if(player){
                const {w, color, maxHp, maxBullet, middleBullet, maxCoolDown} = PLAYER_OFFSET[player.id];
                ctx.fillStyle = color;
                ctx.fillRect(player.x - w/2, player.y - w/2, w, w);

                //padding hp
                const hpLen = HP_WIDTH * player.hp / maxHp;
                ctx.fillStyle = 'red';
                ctx.fillRect(player.x - HP_WIDTH/2, player.y - 30, hpLen, HP_HEIGHT);
                //border hp
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(player.x - HP_WIDTH/2, player.y - 30, HP_WIDTH, HP_HEIGHT);

                //bullet bar
                for(let i = 0; i < maxBullet; i++){
                    if(i <= player.bullet){
                        let x = 0;
                        
                        if(i != middleBullet){
                            const del = middleBullet - i;
                            x = del * BULLET_BAR_W + del * BULLET_BAR_SPACING;
                        }
                        ctx.fillStyle = '#995';
                        if(i == player.bullet){
                            if(player.coolDown != 0){
                                const cooldownLen = 1 - player.coolDown/maxCoolDown;
                                ctx.fillRect(player.x - x - BULLET_BAR_W/2, player.y - 22, BULLET_BAR_W * cooldownLen, BULLET_BAR_H);
                            }
                        }
                        else
                            ctx.fillRect(player.x - x - BULLET_BAR_W/2, player.y - 22, BULLET_BAR_W, BULLET_BAR_H);
                    }
                }
            }
        }
        for(const new_bomp of data.initBomps){
            BOMP_OFFSET[new_bomp.id] = {
                w: new_bomp.w,
                color: new_bomp.color,
                r: new_bomp.r,
                count: MINCOUNT,
                time: 0
            }
        }
        for(const bomp of data.update.bomps){
            if(bomp){
                const {w, r, color, count, time} = BOMP_OFFSET[bomp.id];
                ctx.fillStyle = color;
                //border
                ctx.beginPath();
                ctx.globalAlpha = 0.2;
                ctx.arc(bomp.x, bomp.y, r, 0, 2*Math.PI);
                ctx.stroke();
                //padding
                ctx.beginPath();
                ctx.globalAlpha = 0.2;
                ctx.arc(bomp.x, bomp.y, r, 0, 2*Math.PI);
                ctx.fill();
                //effect
                ctx.beginPath(); 
                ctx.globalAlpha = 0.4;
                ctx.arc(bomp.x, bomp.y, r * count / 100, 0, 2*Math.PI);
                if(time % 2 == 0)
                    BOMP_OFFSET[bomp.id].count+= 10;
                if(count > 100)
                    BOMP_OFFSET[bomp.id].count = MINCOUNT;
                BOMP_OFFSET[bomp.id].time++;
                ctx.fill();
                ctx.globalAlpha = 1;
                //center
                ctx.beginPath();
                ctx.arc(bomp.x, bomp.y, w, 0, 2*Math.PI);
                ctx.fill();
            }
        }
        for(const id of data.delete.bomps){
            if(BOMP_OFFSET[id])
                delete BOMP_OFFSET[id];
        }
    }

    function OnConnected(data){
        for(const player of data.players){
            if(player){
                PLAYER_OFFSET[player.id] = {
                    w: player.w,
                    color: player.color,
                    maxBullet: player.maxBullet,
                    maxHp: player.maxHp,
                    maxCoolDown: player.maxCoolDown,
                    middleBullet: player.maxBullet % 2 == 0 ? player.maxBullet / 2 - 0.5 : Math.floor(player.maxBullet/2)
                }
            }
        }
        for(const bomp of data.bomps){
            if(bomp){
                BOMP_OFFSET[bomp.id] = {
                    w: bomp.w,
                    color: bomp.color,
                    r: bomp.r,
                    count: MINCOUNT,
                    time: 0
                }
            }
        }
    }

    function OnDisconnected(id){
        delete PLAYER_OFFSET[id];
        console.log(Object.keys(PLAYER_OFFSET), Object.keys(PLAYER_OFFSET).length);
    }

    document.addEventListener('keydown', (e)=>{
        e.preventDefault();
        switch(e.code){
            case 'KeyA':
            case 'KeyD':
            case 'KeyW':
            case 'KeyS':
            case 'Space':
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                const direc = DIRECTION[e.code];
                if(STATE[direc] == false){
                    socket.volatile.emit('handleInput', {
                        type: 'keydown',
                        state: direc
                    });
                    STATE[direc] = true;
                }
                break;
        }
    });
    document.addEventListener('keyup', (e)=>{
        switch(e.code){
            case 'KeyA':
            case 'KeyD':
            case 'KeyW':
            case 'KeyS':
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'ArrowUp':
            case 'ArrowDown':
                socket.volatile.emit('handleInput', {
                    type: 'keyup',
                    state: DIRECTION[e.code]
                });
                STATE[DIRECTION[e.code]] = false;
                break;
        }
    });
    document.addEventListener('mousemove', (e)=>{
        e.preventDefault();
        const {clientX: x, clientY: y} = e;
        socket.volatile.emit('mousemove', {x, y});
    })
    document.addEventListener('mousedown', (e)=>{
        e.preventDefault();
        socket.volatile.emit('handleInput', {
            type: 'keydown',
            state: 'shoot'
        });
    });
    document.addEventListener('contextmenu', (e)=>e.preventDefault());
}
window.addEventListener('load', App);