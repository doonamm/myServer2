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
}
const Users = {
    'nam': {
        color: '#ddad9a',
        isActive: false
    },
    'thu': {
        color: RandomColor(),
        isActive: false
    },
}
const Clients = {};

const PLAYER_LIST = {};
const PLAYER_INIT = [];

const BOMP_LIST = {};
const BOMP_INIT = [];
const NEW_BOMP = [];

const updatePack = {
    players: [],
    bomps: []
};

const deletePack = {
    bomps: []
}


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
                isActive: false
            };
            socket.emit('signUpResponse', {
                success: true,
            });
            console.log(ACCOUNT_DB);
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

setInterval(Update, 15);

//function
function Update(){

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

function LogInAccount(socket, username){
    console.log('id:', socket.id,'--- user:', username, '--- connected');
    Clients[socket.id] = socket;
    Users[username].isActive = true;
    socket.emit('signInResponse', {
        success: true,
        color: Users[username].color,
        username: username,
        id: socket.id
    });
    socket.on('disconnect', function(){
        console.log('Id:', socket.id, '--- user:', username, '--- disconnected');
        Users[username].isActive = false;
        delete Clients[socket.id];
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

function ClientUpdate(){
    for(const id in PLAYER_LIST){
        updatePack.players.push(PLAYER_LIST[id].getPack());
        PLAYER_LIST[id].update();

        const {w, x, y} = PLAYER_LIST[id];
        for(const id_bomp in BOMP_LIST){
            BOMP_LIST[id_bomp].checkCollideObject(id, x, y, w);
        }
    }
    for(const id in BOMP_LIST){
        updatePack.bomps.push(BOMP_LIST[id].getPack());
        BOMP_LIST[id].update();
    }

    IO.emit('update', {
        initBomps: NEW_BOMP,
        update: updatePack,
        delete: deletePack
    });

    updatePack.players = [];
    updatePack.bomps = [];
    deletePack.bomps = [];
    NEW_BOMP.length = 0;;
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

    this.getInitialPack = ()=>{
        return{
            id: this.id,
            w: this.w,
            color: this.color,
            r: this.r,
        }
    }
    this.getPack = ()=>{
        return{
            id: this.id,
            x: this.x,
            y: this.y
        }
    }
    this.checkCollideObject = (id, x, y, w)=>{
        if(this.followObjectId !== null || this.shooterId == id || this.speed == 0)
            return;
        const distance = GetDistance({x: this.x, y: this.y}, {x, y})
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
        for(const id_player in PLAYER_LIST){
            const {w, x, y} = PLAYER_LIST[id_player];
            this.checkExplodeArea(id_player, x, y, w);
        }
        BOMP_INIT.forEach((bomp, i)=>{
            if(bomp.id === this.id)
                delete BOMP_INIT[i];
        });
        deletePack.bomps.push(this.id);
        delete BOMP_LIST[this.id];
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
            BOMP_LIST[bomp.id] = bomp;
            const init_data = bomp.getInitialPack();
            BOMP_INIT.push(init_data);
            NEW_BOMP.push(init_data);

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
        for(const id of this.stickyObject){
            BOMP_LIST[id].speed = 0;
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
        hp: 10,
        maxHp: 10,
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

function RandomIDSocket(){
    return RandomInRange(0, 999999).toString().padStart(6, '0');
}

function RandomInRange(min, max){
    return Math.floor(Math.random()*(max - min + 1)  + min);
}