const socket = io();
const DIREC_NOR = {
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
const DIREC_SWAP = {
    'KeyA': 'left',
    'KeyD': 'right',
    'KeyW': 'down',
    'KeyS': 'up',
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'down',
    'ArrowDown': 'up',
    'Space': 'shoot'
}
var DIRECTION = DIREC_NOR;
const STATE = {
    'left': false,
    'right': false,
    'up': false,
    'down': false
}
const PLAYER_OFFSET = {};
const MINCOUNT = 10;
const HP_WIDTH = 40;
const HP_HEIGHT = 5;
const BULLET_BAR_W = 10;
const BULLET_BAR_H = 5;
const BULLET_BAR_SPACING = 2;
var isSwap = false;
var color = 'black';
const avtUrl = `https://cdn-icons-png.flaticon.com/128/1077/1077063.png`;

const App = ()=>{
    UserLogin();
    UserInterface();
    Game();
}
function UserLogin(){
    const loginForm = document.getElementById('signin-form');
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const signUpBtn = document.getElementById('signUpBtn');

    loginForm.addEventListener('submit', OnSignIn);
    signUpBtn.addEventListener('click', OnSignUp);
    socket.on('signInResponse', SignInResponse);
    socket.on('signUpResponse', SignUpResponse);

   
    function OnSignUp(){
        socket.volatile.emit('signUpRequest', {
            username: username.value,
            password: password.value
        });
    }
    function SignUpResponse(res){
        if(res.success){
            alert('Sign up success!');
        }
        else{
            alert(res.message);
        }
        password.value = '';
    }
    function OnSignIn(e){
        e.preventDefault();
        socket.volatile.emit('signInRequest', {
            username: username.value,
            password: password.value
        });
    }
    function SignInResponse(res){
        if(res.success){
            document.getElementById('sign').classList.add('hide');
            document.getElementById('client').classList.add('show');
            color = res.color;
            document.getElementById('input-color').value = res.color;
            document.querySelector('.username-info').textContent = res.username;
            document.querySelector('.id-info').textContent = res.id;
            document.querySelector('.bottom').classList.add('show');
            const li = document.createElement('li');
            li.innerHTML = `
                <img src=${avtUrl}>
                <p>${res.username}</p>
            `;
            document.getElementById('team').appendChild(li);
        }
        else{
            alert(res.message);
        }
        password.value = '';
    }
}
function UserInterface(){
    const clientHome = document.getElementById('client');
    const messageList = document.querySelector('.message-container ul');
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const inputColor = document.getElementById('input-color');
    const joinForm = document.getElementById('join-form');
    const joinCode = document.querySelector('#join-form input');
    const team = document.getElementById('team');
    const idRoomInfo = document.querySelector('.id-info');
    const reloadMessBtn = document.getElementById('scroll-mess-btn');
    const outRoomBtn = document.getElementById('out-room-btn');
    const pvpBtn = document.getElementById('pvp-match');
    const pvbBtn = document.getElementById('bot-match');

    messageList.addEventListener('scroll', OnScroll)
    messageForm.addEventListener('submit', OnSubmit);
    inputColor.addEventListener('change', OnChangeColor);
    reloadMessBtn.addEventListener('click', ScrollMessage);
    joinForm.addEventListener('submit', JoinSubmit);
    joinCode.addEventListener('keydown', JoinInput);
    outRoomBtn.addEventListener('click', OutRoom);
    pvpBtn.addEventListener('click', StartMatch);

    socket.on('messageResponse', MessageResponse);
    socket.on('joinResponse', JoinResponse);
    socket.on('roomUpdate', RoomUpdate);
    socket.on('startMatchResponse', OnStartMatch);

    joinCode.value = "#";
    function OnStartMatch(data){
        document.getElementById('cvs').classList.add('show');
        clientHome.classList.remove('show');
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
        if(data.swap){
            ctx.translate(0, canvas_h);
            ctx.scale(1, -1);
            isSwap = true;
            DIRECTION = DIREC_SWAP;
        }
    }
    function StartMatch(){
        socket.volatile.emit('startMatchRequest');
    }
    function OutRoom(){
        socket.volatile.emit('outRoomRequest');
        outRoomBtn.classList.remove('show');
    }
    function JoinInput(e){
        if(e.target.value.length <= 1 && e.code == 'Backspace'){
            e.preventDefault();
        }
    }
    function JoinSubmit(e){
        e.preventDefault();
        socket.volatile.emit('joinRequest', joinCode.value.slice(1));
    }
    function AddTeamate(name){
        const li = document.createElement('li');
        li.innerHTML = `
            <img src=${avtUrl}>
            <p>${name}</p>
        `;
        team.appendChild(li);
    }
    function RoomUpdate(data){
        team.innerHTML = '';
        idRoomInfo.textContent = data.id;
        for(const {name} of data.list){
            AddTeamate(name);
        }
    }
    function JoinResponse(success){
        if(!success){
            alert('Can\'t find room');
        }
        else{
            outRoomBtn.classList.add('show');
        }
    }
    function OnChangeColor(e){
        color = e.currentTarget.value;
        socket.volatile.emit('changeColor', e.currentTarget.value);
    }
    function OnSubmit(e){
        e.preventDefault();
        MessageRequest(messageInput.value);
        messageInput.value = '';        
    }
    function OnScroll(e){
        if(e.currentTarget.scrollTop == 0){
            reloadMessBtn.classList.remove('show');
        }
    }
    function ScrollMessage(){
        messageList.scrollTop = 0;
        reloadMessBtn.classList.remove('show');
    }
    function MessageRequest(message){
        socket.volatile.emit('messageRequest', message);
    }
    function MessageResponse(res){
        if(res.success){
            const isOnAuto = Math.floor(messageList.scrollTop) == 0 ? true : false;
            AddMessage(res.message);
            if(isOnAuto){
                messageList.scrollTop = 0;
            }
            else{
                reloadMessBtn.classList.add('show');
            }
        }
    }
    function AddMessage(message){
        const li = document.createElement('li');
        li.textContent = message;
        messageList.insertBefore(li, messageList.firstChild);
    }
}
function Game(){
    const canvas = document.getElementById('cvs');
    const canvas_w = 500;
    const canvas_h = 500;
    const ctx = canvas.getContext('2d');
    
    socket.on('update', Update);


    function Update(data){
        ctx.clearRect(0, 0, canvas_w, canvas_h);
        for(const player of data.players){
            if(player){
                const {w, color, maxHp, maxBullet, middleBullet, maxCoolDown} = PLAYER_OFFSET[player.id];
                ctx.fillStyle = color;
                ctx.fillRect(player.x - w/2, player.y - w/2, w, w);

                //padding hp
                const hpLen = HP_WIDTH * player.hp / maxHp;
                ctx.fillStyle = 'red';
                ctx.fillRect(player.x - HP_WIDTH/2, checkIsSwapY(player.y, 30, HP_HEIGHT), hpLen, HP_HEIGHT);
                //border hp
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(player.x - HP_WIDTH/2, checkIsSwapY(player.y, 30, HP_HEIGHT), HP_WIDTH, HP_HEIGHT);

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
                                ctx.fillRect(player.x - x - BULLET_BAR_W/2, checkIsSwapY(player.y, 22, BULLET_BAR_H), BULLET_BAR_W * cooldownLen, BULLET_BAR_H);
                            }
                        }
                        else
                            ctx.fillRect(player.x - x - BULLET_BAR_W/2, checkIsSwapY(player.y, 22, BULLET_BAR_H), BULLET_BAR_W, BULLET_BAR_H);
                    }
                }
            }
        }
        for(const bomp of data.bomps){
            if(bomp){
                ctx.fillStyle = PLAYER_OFFSET[bomp.shooterId].color;
                //border
                ctx.beginPath();
                ctx.globalAlpha = 0.2;
                ctx.arc(bomp.x, bomp.y, bomp.r, 0, 2*Math.PI);
                ctx.stroke();
                //padding
                ctx.beginPath();
                ctx.globalAlpha = 0.2;
                ctx.arc(bomp.x, bomp.y, bomp.r, 0, 2*Math.PI);
                ctx.fill();
                //effect
                ctx.beginPath(); 
                ctx.globalAlpha = 0.4;
                ctx.arc(bomp.x, bomp.y, bomp.r * bomp.count / 100, 0, 2*Math.PI);
                ctx.fill();
                ctx.globalAlpha = 1;
                //center
                ctx.beginPath();
                ctx.arc(bomp.x, bomp.y, bomp.w, 0, 2*Math.PI);
                ctx.fill();
            }
        }
    }
    

    function checkIsSwapY(val1, val2, del){
        return isSwap ? val1 + val2 - del : val1 - val2;
    }

    document.addEventListener('keydown', (e)=>{
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
        if(isSwap)
            socket.volatile.emit('mousemove', {x: x, y: canvas_h - y});
        else
            socket.volatile.emit('mousemove', {x, y});
    });
    document.addEventListener('mousedown', (e)=>{
        // e.preventDefault();
        socket.volatile.emit('handleInput', {
            type: 'keydown',
            state: 'shoot'
        });
    });
    document.addEventListener('contextmenu', (e)=>e.preventDefault());
}
window.addEventListener('load', App);