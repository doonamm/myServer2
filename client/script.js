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

    socket.on('update', (data)=>{
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        for(let id in data){
            ctx.fillStyle = data[id].color;
            ctx.fillRect(data[id].x, data[id].y, data[id].w, data[id].h);
        }
    });
    
    function Update(){
        ctx.clearRect(0, 0, canvas_w, canvas_h);
    }

    document.addEventListener('keydown', (e)=>{
        switch(e.code){
            case 'KeyA':
            case 'KeyD':
            case 'KeyW':
            case 'KeyS':
                socket.emit('handleInput', {
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
                socket.emit('handleInput', {
                    type: 'keyup',
                    state: DIRECTION[e.code]
                });
                break;
        }
    });
}
window.addEventListener('load', App);