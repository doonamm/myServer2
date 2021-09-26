const EXPRESS = require('express');
const APP = EXPRESS();
const SERVER = require('http').Server(APP);
const IO = require('socket.io')(SERVER);

//server
APP.get('/', function(request, response){
    response.sendFile(__dirname + '/client/index.html');
});
APP.use(EXPRESS.static(__dirname + '/client'));
SERVER.listen(process.env.PORT || 2000, ()=>console.log('\nServer started, listening...\n'));

//main
const PLAYER_LIST = {};

IO.on('connection', function(socket){
    const id = RandomIDSocket();
    console.log('Id:', id, '- connected');

    PLAYER_LIST[id] = Player(id);

    socket.on('disconnect', function(){
        console.log('ID:', id, '- disconnected');
        delete socket;
        delete PLAYER_LIST[id];
    });

    socket.on('handleInput', function(data){
        if(data.type === 'keydown'){
            PLAYER_LIST[id][data.state] = true;
        }
        else if(data.type === 'keyup'){
            PLAYER_LIST[id][data.state] = false;
        }
    })
});

setInterval(ClientUpdate, 25);

//function
function ClientUpdate(){
    for(const id in PLAYER_LIST){
        if(PLAYER_LIST[id].left){
            PLAYER_LIST[id].x -= PLAYER_LIST[id].speed;
        }
        else if(PLAYER_LIST[id].right){
            PLAYER_LIST[id].x += PLAYER_LIST[id].speed;
        }
        if(PLAYER_LIST[id].up){
            PLAYER_LIST[id].y -= PLAYER_LIST[id].speed;
        }
        else if(PLAYER_LIST[id].down){
            PLAYER_LIST[id].y += PLAYER_LIST[id].speed;
        }
    }

    IO.emit('update', PLAYER_LIST);
}

function Player(id){
    return{
        id: id,
        x: 250,
        y: 250,
        w: 30,
        h: 30,
        speed: 10,
        color: RandomColor(),
        left: false,
        right: false,
        up: false,
        down: false
    }
}

function RandomColor(){
    const r = RandomInRange(0, 255);
    const g = RandomInRange(0, 255);
    const b = RandomInRange(0, 255);
    return '#' + r.toString(16) + g.toString(16) + b.toString(16);
}

function RandomIDSocket(){
    return RandomInRange(0, 999999).toString().padStart(6, '0');
}

function RandomInRange(min, max){
    return Math.floor(Math.random()*(max - min + 1)  + min);
}