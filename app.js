const EXPRESS = require('express');
const APP = EXPRESS();
const SERVER = require('http').createServer(APP);
const IO = require('socket.io')(SERVER);

//server
APP.get('/', function(request, response){
    response.sendFile(__dirname + '/client/index.html');
});
APP.use(EXPRESS.static(__dirname + '/client'));
SERVER.listen(process.env.PORT || 2000, ()=>console.log('\nServer started, listening...\n'));

//main
const PLAYER_LIST = {};
const PLAYER_INIT = [];

IO.sockets.on('connection', function(socket){
    const id = RandomIDSocket();
    console.log('Id:', id, '- connected');

    PLAYER_LIST[id] = new Player(NewPlayerData(id));

    PLAYER_INIT.push({
        id: id,
        w: PLAYER_LIST[id].w,
        color: PLAYER_LIST[id].color
    });

    IO.sockets.emit('connected', {players: PLAYER_INIT});

    socket.on('disconnect', function(){
        RemovePlayer(id);
        delete socket;
    });

    socket.on('handleInput', function(data){
        if(data.type == 'keydown'){
            PLAYER_LIST[id].status[data.state] = true;
        }
        else if(data.type == 'keyup'){
            PLAYER_LIST[id].status[data.state] = false;
        }
    });
});

setInterval(ClientUpdate, 15);

//function
function ClientUpdate(){
    const updatePack = {
        players: []
    };
    for(const id in PLAYER_LIST){
        PLAYER_LIST[id].updatePosition();
        updatePack.players.push(PLAYER_LIST[id].getPack());
    }

    IO.emit('update', updatePack);
}

function RemovePlayer(id){
    console.log('Id:', id, '- disconnected');
    IO.sockets.emit('disconnected', id);

    PLAYER_INIT.forEach((player, i)=>{
        if(player.id === id)
            delete PLAYER_INIT[i];
    });

    delete PLAYER_LIST[id];
}

function Player(data){
    GameObject.call(this, data);
    this.status = {
        left: false,
        right: false,
        up: false,
        down: false
    }
    this.getInitialPack = ()=>{
        return{
            id: this.id,
            w: this.w,
            color: this.color
        }
    }
    this.getPack = ()=>{
        return{
            id: this.id,
            x: this.x,
            y: this.y,
        }
    }
    this.updatePosition = ()=>{
        //if object is disabled, do nothing
        if(this.speed === 0)
            return;

        if(this.status.left){
            this.spX = -this.speed;
        }
        else if(this.status.right){
            this.spX = this.speed;
        }
        else{
            this.spX = 0;
        }

        if(this.status.up){
            this.spY = - this.speed;
        }
        else if(this.status.down){
            this.spY = this.speed;
        }
        else{
            this.spY = 0;
        }

        this.x += this.spX;
        this.y += this.spY;

        this.checkCollision();
    }
    this.checkCollision = ()=>{
        const del = this.w/2;
        if(this.x - del < 0)
            this.x = del;
        else if(this.x + del > 500)
            this.x = 500 - del;
        if(this.y - del < 0)
            this.y = del;
        else if(this.y + del > 500)
            this.y = 500 - del;
    }
}

function GameObject(data){
    this.id = data.id;
    this.x = data.x || 250;
    this.y = data.y || 250;
    this.w = data.w || 10;
    this.h = data.h || 10;
    this.speed = data.speed || 0;
    this.spX = data.spX || 0;
    this.spY = data.spY || 0;
    this.color = data.color || 'black';
}

function NewPlayerData(id){
    return{
        id: id,
        x: 250,
        y: 250,
        w: 20,
        speed: 10,
        color: RandomColor()
    }
}

function RandomColor(){
    const r = RandomInRange(22, 222);
    const g = RandomInRange(22, 222);
    const b = RandomInRange(22, 222);
    return '#' + r.toString(16) + g.toString(16) + b.toString(16);
}

function RandomIDSocket(){
    return RandomInRange(0, 999999).toString().padStart(6, '0');
}

function RandomInRange(min, max){
    return Math.floor(Math.random()*(max - min + 1)  + min);
}