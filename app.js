const EXPRESS = require('express');
const APP = EXPRESS();
const SERVER = require('http').Server(APP);
const IO = require('socket.io')(SERVER);

APP.get('/', function(request, response){
    response.sendFile(__dirname + '/client/index.html');
});
APP.use(EXPRESS.static(__dirname + '/client'));
SERVER.listen(process.env.PORT || 2000, ()=>console.log('\nServer started, listening...\n'));

IO.on('connection', function(socket){
    const id = RandomIDSocket();
    console.log('Id:', id, '- connected');

    socket.on('disconnect', function(){
        console.log('ID:', id, '- disconnected');
    });
});

function RandomIDSocket(){
    return Math.floor(Math.random()*100000).toString().padStart(6, '0');
}