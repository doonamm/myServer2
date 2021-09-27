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
const PLAYER_OFFSET = {};
const BOMP_OFFSET = {};
const MINCOUNT = 10;

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
                const {w, color} = PLAYER_OFFSET[player.id];
                ctx.fillStyle = color;
                ctx.fillRect(player.x - w/2, player.y - w/2, w, w);
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
                    color: player.color
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
        console.log(Object.keys(BOMP_OFFSET), Object.keys(BOMP_OFFSET).length);
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
                socket.volatile.emit('handleInput', {
                    type: 'keydown',
                    state: DIRECTION[e.code]
                });
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