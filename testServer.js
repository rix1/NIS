var net = require('net');
var readline = require('readline');
var os = require('os');
//====== Encryption and decryption ======//

var crypto = require('./crypto');

//====== Encryption and decryption ======//


//======= read file ========//
var fs = require('fs');
var path = require('path');
var filePath = path.join(__dirname, 'test.json');

//======= read file ========//


//======= read file ========//
var config;

function setConfig(config1){
    config = config1;
}

function getConfig(callback){
    fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
        if (err){
            console.log(err);
        }
    //console.log(data);
    callback(JSON.parse(data));
});
}

function saveConfig(callback){
    fs.writeFile('test.json', JSON.stringify(config), function (err) {
  if (err) throw err;
  console.log('It\'s saved!');
  callback(callback(0));
});
}

//======= read file ========//

//var q = require('q');

rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ============= PROGRAM FLOW ============= //

if(!started){
    getConfig(setConfig);
    // rl.question("Welcome to OHAIchat\nWhats your name?\n", function(answer){
    //     setName(answer.trim()); // Sanitation?
    // });
    started = true;
}



var re = /\d{4}/ // 4 digit regex matching
var client = new net.Socket();
var started = false;
rl.prompt();


function completer(line) {
    var completions = '.help .error .exit .quit .q'.split(' ')
    var hits = completions.filter(function(c) { return c.indexOf(line) == 0 })
    // show all completions if none found
    return [hits.length ? hits : completions, line]
}

// ============= HELPER METHODS ============= //

function setName(name){
    config.name = name;
    rl.setPrompt(" > " + config.name + ": ");
}


function logD(code, string){
    if(code == 1){
        console.log(">> " + string);
    }

    if(code == 2 && config.DEBUG){
        console.log("APP: " + string);
    }
}


function editPort(flag, command){
    rl.question("Specify port: ", function(ans){

        if(re.test(ans.trim())){
            if(flag == 'local'){
                return command(ans.trim());
            }else if(flag == 'remote'){
                return command(ans.trim());
            }else{
                logD(2, "FlagError when assigning port");
            }
            command(ans);
        }else{
            logD(2, "Default port selected");
            command(ans);
        }
    })}


rl.on('line', function(line) {
    switch(line.trim()) {
        case 'exit':
        rl.close();
        break;

        case 'status':
        console.log(config);
        break;

        case 'help':
        console.log();
        break;

        case 'connect':
        // editPort('remote', function(res){
        //     connect(res);
        // });
        connect();
        // console.log(config.localPort);
        break;

        case 'disconnect':
        disconnect();
        break;

        default:
        var rs = line.split(" ");

        if(rs[0] == 'start' && (rs[1] =='server' || rs[1] == '-s')){
            // editPort('local', function(res){
            //     startServer(res);
            // });
            startServer();
        }

        if(config.connected){
            client.write(crypto.encrypt(line));
            break;
        }else{
            console.log('Echo aka you are offline: `' + line.trim() + '`');
        }break;
    }
    rl.prompt();
}).on('close', function() {
    disconnect();
    stopServer();
    saveConfig(process.exit);
    console.log('Have a great day!');
});


// '169.254.13.106'
function connect(){
    //config.remotePort = port;
    console.log("Trying to connect to " + config.remotePort + ":" + config.REMOTE);
    client.connect(config.remotePort, config.REMOTE, function(){ // ConnectionListener
        console.log('Connected to server');
        config.connected = true;
    });
}

client.on('error', function(e){
    if(e.code == 'ECONNREFUSED'){
        console.log("Cannot connect to server: " + e.code);
        rl.prompt();
    }
});

client.on('data', function(data){
    console.log('Server> ' + data);
    rl.prompt();
    //client.destroy();
});

client.on('close', function(){
    if(config.connected){
        console.log("woops, seems we lost connection...");
    }
    config.connected = false;
    // console.log('Disconnected from ' + client.remoteAddress);
});




// ============= SERVER ============= //



var server = net.createServer(function(client){
    console.log('SERVER > ' + client.address().address + ' is connected');

    client.on('end', function(){
        console.log('SERVER > wops, ' + client.address().address + ' has disappeared');
    });

    client.write(" > " + config.name + ": Hi! We are connected!" );

    client.on('data', function(data){

        console.log(crypto.decrypt(data.toString()));
    })
});

server.on('close', function(){
    logD(2, "Close event emitted.");
})

function stopServer(){
    console.log("server stopped...");
    config.serverRunning = false;
}

function disconnect(){
    console.log("Disconnected from remote client");
    config.connected = false;
    client.end();
}

function startServer(){
    config.serverRunning = true;
    console.log("Server started at " + config.localPort + ":" + config.HOST);
    server.listen(config.localPort, config.HOST, function(){ // Viktig at denne porten er forskjellig!
        if(server.address().address == '::'){
            console.log('Hostname: ' + os.hostname());
            console.log('Server running on ' + config.HOST + ":" + server.address().port);

        }else {
            console.log('Server running on ' + server.address().address + ":" + server.address().port);
        }
    });
}