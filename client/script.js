const socket = io();
const DIRECTION = {
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyW': 'up',
    'KeyS': 'down'
}
const App = ()=>{
    const canvas = document.getElementById('cvs');
    const canvas_w = 500;
    const canvas_h = 500;
    const ctx = canvas.getContext('2d');
    const PLAYER_OFFSET = {};

    socket.on('connected', OnConnected);
    socket.on('disconnected', OnDisconnected);
    socket.on('update', Update);

    // ctx.arc(x, y, radius, startAngle, endAngle, counterclockwise)
    function Update(data){
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        for(let player of data.players){
            if(player){
                const {w, color} = PLAYER_OFFSET[player.id];
                ctx.fillStyle = color;
                ctx.fillRect(player.x - w/2, player.y - w/2, w, w);
            }
        }
    }

    function OnConnected(data){
        for(let player of data.players){
            if(player){
                PLAYER_OFFSET[player.id] = {
                    w: player.w,
                    color: player.color
                }
            }
        }
        console.log(Object.keys(PLAYER_OFFSET), Object.keys(PLAYER_OFFSET).length);
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
                socket.volatile.emit('handleInput', {
                    type: 'keyup',
                    state: DIRECTION[e.code]
                });
                break;
        }
    });
}
window.addEventListener('load', App);