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
const ACCOUNT_DB = {
    'nam': '321',
    'thu': '123',
    '1': '1',
    '2': '2',
    '3': '3',
}
const Users = {
    'nam': {
        color: '#ddad9a',
        isActive: false,
        roomId: RandRoomId()
    },
    'thu': {
        color: RandomColor(),
        isActive: false,
        roomId: RandRoomId()
    },
    '1': {
        color: RandomColor(),
        isActive: false,
        roomId: RandRoomId()
    },
    '2': {
        color: RandomColor(),
        isActive: false,
        roomId: RandRoomId()
    },
    '3': {
        color: RandomColor(),
        isActive: false,
        roomId: RandRoomId()
    }
}
const Clients = {};
const Room = {};
const Match = [];

const PLAYER_LIST = {};
const PLAYER_INIT = [];

const BOMB_LIST = {};

const updatePack = {
    players: [],
    bomps: []
};

IO.sockets.on('connection', function(socket){
    socket.on('signUpRequest', function(user){
        const isValidNewUser = CheckSignUpAccount(user, function(message){
            socket.emit('signUpResponse', {
                success: false,
                message: message
            });
        });
        if(isValidNewUser){
            ACCOUNT_DB[user.username] = user.password;
            Users[user.username] = {
                color: RandomColor(),
                isActive: false,
                roomId: RandRoomId()
            };
            socket.emit('signUpResponse', {
                success: true,
            });
        }
    });
    socket.on('signInRequest', function(user){
        const isValidLogin = CheckSignInAccount(user, (message)=>{
            socket.emit('signInResponse', {
                success: false,
                message: message
            });
        });
        if(isValidLogin){
            LogInAccount(socket, user.username);
        }
    });
});

setInterval(ClientUpdate, 15);


function ClientUpdate(){
    if(Match.length > 0){
        for(const room of Match){
            for(const {id: player_id} of room.list){
                updatePack.players.push(PLAYER_LIST[player_id].getPack());
                PLAYER_LIST[player_id].update();
                const {w, x, y} = PLAYER_LIST[player_id];
                for(const bomb_id in room.bombList){
                    room.bombList[bomb_id].checkCollideObject(player_id, x, y, w);
                }
            }
            for(const bomp_id in room.bombList){
                updatePack.bomps.push(room.bombList[bomp_id].getPack());
                room.bombList[bomp_id].update();
            }
            for(const {id} of room.list){
                Clients[id].emit('update', updatePack)
            }
        
            updatePack.players = [];
            updatePack.bomps = [];
        }
    }
}

function CheckSignUpAccount(user,  callError){
    if(user.username.trim() === ''){
        callError('Username is empty');
        return false;
    }
    if(user.password.trim() === ''){
        callError('Password is empty');
        return false;
    }
    if(ACCOUNT_DB[user.username]){
        callError('Username is already exist');
        return false;
    }
    return true;
}

function NewRoom(socketId){
    return{
        list: [],
        bombList: {},
        hostId: socketId
    }
}
function OutRoom(roomId, socketId){
    Room[roomId].list.forEach(({id}, index)=>{
        if(id == socketId){
            Room[roomId].list.splice(index, 1);
        }
    });
    if(Room[roomId].list.length === 0){
        delete Room[roomId];
    }
    else{
        TriggerRoomUpdate(roomId);
        if(Room[roomId].hostId === socketId){
            Room[roomId].hostId = Room[roomId].list[0].id;
        }
    }
}
function TriggerRoomUpdate(roomId){
    for(const data of Room[roomId].list){
        Clients[data.id].emit('roomUpdate', {
            list: Room[roomId].list,
            id: roomId
        });
    }
}

function LogInAccount(socket, username){
    console.log('id:', socket.id,'--- user:', username, '--- connected');
    Clients[socket.id] = socket;
    Users[username].isActive = true;
    const roomId = Users[username].roomId;
    const dataRoomUser = {
        name: username,
        color: Users[username].color,
        id: socket.id
    }
    Room[roomId] = NewRoom(socket.id);
    Room[roomId].list.push(dataRoomUser);
    socket.on('startMatchRequest', function(){
        for(const {id: player_id, color} of Room[Users[username].roomId].list){
            PLAYER_LIST[player_id] = new Player(NewPlayerData(player_id));
            PLAYER_LIST[player_id].roomId = Users[username].roomId;
            PLAYER_LIST[player_id].color = color;
            BOMB_LIST[player_id]={};
            PLAYER_INIT.push(PLAYER_LIST[player_id].getInitialPack());

            Clients[player_id].on('handleInput', function(data){
                if(data.type == 'keydown'){
                    PLAYER_LIST[player_id].status[data.state] = true;
                }
                else if(data.type == 'keyup'){
                    PLAYER_LIST[player_id].status[data.state] = false;
                }
            });
        
            Clients[player_id].on('mousemove', (data)=>{
                PLAYER_LIST[player_id].aim = data;
            })
        }
        for(const data of Room[Users[username].roomId].list){
            Clients[data.id].emit('startMatchResponse', {
                players: PLAYER_INIT,
                swap: false
            });
        }
        Match.push(Room[Users[username].roomId]);
    });
    socket.on('outRoomRequest', function(){
        if(Room[Users[username].roomId].list.length > 1){
            OutRoom(Users[username].roomId, socket.id);
            const newId = RandRoomId();
            Users[username].roomId = newId;
            Room[newId] = NewRoom(socket.id);
            Room[newId].list.push(dataRoomUser);
            TriggerRoomUpdate(newId);
        }
    });
    socket.on('joinRequest', function(id){
        if(Room[id] && Room[id].hostId !== socket.id && Room[id].list.length < 5){
            OutRoom(Users[username].roomId, socket.id);
            Room[id].list.push(dataRoomUser);
            Users[username].roomId = id;
            TriggerRoomUpdate(id);
            socket.emit('joinResponse', true);
        }
        else{
            socket.emit('joinResponse', false);
        }
    });
    socket.emit('signInResponse', {
        success: true,
        color: Users[username].color,
        username: username,
        id: Users[username].roomId
    });
    socket.on('disconnect', function(){
        console.log('Id:', socket.id, '--- user:', username, '--- disconnected');
        Users[username].isActive = false;
        delete Clients[socket.id];
        OutRoom(Users[username].roomId, socket.id);
        Users[username].roomId = RandRoomId();
    });
    socket.on('messageRequest', function(message){
        if(message.trim() !== ''){
            IO.sockets.emit('messageResponse', {
                success: true,
                message: `${username}: ${message}`
            });
        }
        else{
            IO.sockets.emit('messageResponse', {
                success: false
            });
        }
    });
    socket.on('changeColor', function(color){
        Users[username].color = color;
    }); 
}

function CheckSignInAccount({username, password}, callError){
    if(!ACCOUNT_DB[username]){
        callError('User is not exist!');
        return false;
    }
    if(ACCOUNT_DB[username] !== password){
        callError('Wrong username or password!');
        return false;
    }
    if(Users[username].isActive){
        callError('User is online!');
        return false;
    }
    return true;
}

function Bomb(data){
    GameObject.call(this, data);
    this.r = data.r;
    this.followObjectId = data.followObjectId || null;
    this.shooterId = data.shooterId;
    this.existTime = data.existTime;
    this.countDown = -1;
    this.maxDistance = data.maxDistance;
    this.currentDistance = 0;
    this.spX =  Math.round(Math.cos(data.angle) * this.speed);
    this.spY =  Math.round(Math.sin(data.angle) * this.speed);
    this.timeEffect = 0;
    this.countEffect = 20;
    this.getPack = ()=>{
        return{
            shooterId: this.shooterId,
            w: this.w,
            r: this.r,
            x: this.x,
            y: this.y,
            count: this.countEffect
        }
    }
    this.checkCollideObject = (id, x, y, w)=>{
        if(this.followObjectId !== null || this.shooterId == id || this.speed == 0)
            return;
        const distance = GetDistance({x: this.x, y: this.y}, {x, y});
        if(distance <= this.w + w){
            this.followObjectId = id;
            this.countDown = this.existTime;
            PLAYER_LIST[id].stickyObject.push(this.id);
        }
    }
    this.checkExplodeArea = (id, x, y, w)=>{
        if(this.shooterId == id)
            return;
        const distance = GetDistance({x: this.x, y: this.y}, {x, y});
        if(distance <= this.r + w){
            PLAYER_LIST[id].hp--;
            if(PLAYER_LIST[id].hp == 0)
                PLAYER_LIST[id].reset();
        }
    }
    this.removeBomb = ()=>{
        if(this.followObjectId !== null)
            PLAYER_LIST[this.followObjectId].removeStickyObject(this.id);
        const roomId = PLAYER_LIST[this.shooterId].roomId;
        for(const {id} of Room[roomId].list){
            const {w, x, y} = PLAYER_LIST[id];
            this.checkExplodeArea(id, x, y, w);
        }
        delete Room[roomId].bombList[this.id];
    }
    this.updatePosition = ()=>{
        if(this.speed == 0)
            return;
        if(this.followObjectId !== null){
            if(PLAYER_LIST[this.followObjectId] !== undefined){
                this.x = PLAYER_LIST[this.followObjectId].x;
                this.y = PLAYER_LIST[this.followObjectId].y;
            }
            else{
                this.speed = 0;
                this.followObjectId = null;
            }
        }
        else{
            this.x += this.spX;
            this.y += this.spY;

            this.currentDistance += this.speed;
            if(this.checkCollision() == true || this.currentDistance >= this.maxDistance){
                this.speed = 0;
                this.countDown = this.existTime;
            }
        }
    }
    this.counting = ()=>{
        if(this.countDown > 0){
            this.countDown--;
            if(this.countDown <= 0){
                this.removeBomb();
            }
        }
        if(this.timeEffect % 2 == 0){
            this.countEffect += 10;
        }
        if(this.countEffect > 100){
            this.countEffect = 20;
        }
        this.timeEffect++;
    }
    this.checkCollision = ()=>{
        let isCollide = false;
        if(this.x < 0){
            this.x = 0;
            isCollide = true;
        }
        else if(this.x > 500){
            this.x = 500;
            isCollide = true;
        }
        else if(this.y < 0){
            this.y = 0;
            isCollide = true;
        }
        else if(this.y > 500){
            this.y = 500;
            isCollide = true;
        }
        if(isCollide){
            this.speed = 0;
            this.countDown = this.existTime;
        }
    }
    this.update = ()=>{
        this.updatePosition();
        this.checkCollision();
        this.counting();
    }
}

function NewBombData({shooterId, x, y, color, angle}){
    return{
        id: RandomInRange(0, 999999),
        x: x,
        y: y,
        w: 8,
        color: color,
        speed: 15,
        angle: angle,
        shooterId: shooterId,
        r: 30,
        maxDistance: 300,
        existTime: 100
    }
}

function Player(data){
    GameObject.call(this, data);
    this.stickyObject = [];
    this.hp = data.hp;
    this.maxHp = data.maxHp;
    this.bullet = data.maxBullet;
    this.maxBullet = data.maxBullet;
    this.coolDown = 0;
    this.maxCoolDown = data.maxCoolDown;
    this.aim = {
        x: 0,
        y: 0
    }
    this.status = {
        left: false,
        right: false,
        up: false,
        down: false,
        shoot: false
    }
    this.getInitialPack = ()=>{
        return{
            id: this.id,
            w: this.w,
            color: this.color,
            maxHp: this.maxHp,
            maxBullet: this.maxBullet,
            maxCoolDown: this.maxCoolDown
        }
    }
    this.getPack = ()=>{
        return{
            id: this.id,
            x: this.x,
            y: this.y,
            bullet: this.bullet,
            hp: this.hp,
            coolDown: this.coolDown
        }
    }
    this.update = ()=>{
        this.updatePosition();
        this.checkCollision();
        this.shoot();
        this.coolingDown();
    }
    this.shoot = ()=>{ 
        if(this.bullet <= 0){
            this.status.shoot = false;
            return;
        }
        if(this.status.shoot){
            const bomp = new Bomb(NewBombData({
                shooterId: this.id,
                x: this.x,
                y: this.y,
                color: this.color,
                angle: Math.atan2(this.aim.y - this.y, this.aim.x - this.x)
            }));
            Room[this.roomId].bombList[bomp.id] = bomp;

            this.status.shoot = false;
            this.bullet--;
        }
    }
    this.coolingDown = ()=>{
        if(this.bullet < this.maxBullet){
            if(this.coolDown > 0){
                this.coolDown--;
                if(this.coolDown == 0)
                    this.bullet++;
            }
            else{
                this.coolDown = this.maxCoolDown;
            }
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
    this.reset = () =>{
        this.x = 250;
        this.y = 250;
        this.hp = this.maxHp;
        for(const bomb_id of this.stickyObject){
            Room[this.roomId].bombList[bomb_id].speed = 0;
        }
    }
    this.removeStickyObject = (id_bomp)=>{
        this.stickyObject.forEach((id, i) => {
            if(id_bomp == id){
                this.stickyObject.splice(i, 1);
            }
        });
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

function GetDistance(pos1, pos2){
    const delX = pos1.x - pos2.x;
    const delY = pos1.y - pos2.y;
    return Math.round(Math.sqrt(delX * delX + delY * delY));
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

function NewPlayerData(id){
    return{
        id: id,
        x: 250,
        y: 250,
        w: 20,
        speed: 10,
        color: RandomColor(),
        hp: 5,
        maxHp: 5,
        maxBullet: 4,
        maxCoolDown: 80
    }
}

function RandomColor(){
    const r = RandomInRange(22, 222);
    const g = RandomInRange(22, 222);
    const b = RandomInRange(22, 222);
    return '#' + r.toString(16) + g.toString(16) + b.toString(16);
}

function RandRoomId(){
    return RandomInRange(0, 99999).toString().padStart(6, '0');
}

function RandomInRange(min, max){
    return Math.floor(Math.random()*(max - min + 1)  + min);
}