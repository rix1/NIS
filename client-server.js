var net = require('net');
var readline = require('readline');
var os = require('os');
var crypto = require('./crypto');
var fs = require('fs');
var path = require('path');


//======= Variables ========//

var configPath;
var config;

var DEBUG = true;
var re = /\d{4}/ // 4 digit regex matching
var client = new net.Socket();
var started = false;


// ============= Startapp ============= //

rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.prompt(true);

if(!started){
    if(DEBUG){
        var user; 
        rl.question("DEBUG mode: User a or b?", function(answer){
            user = answer.trim();
            configPath = path.join(__dirname, 'debug_' + user + '.json');
            getConfig(setConfig);
            rl.prompt(true);
        });
    }else{
        configPath = path.join(__dirname, 'config.json');
        getConfig(setConfig);
    }
    started = true;
}

function setConfig(config1){
    config = config1;
}

function getConfig(callback){
    fs.readFile(configPath, function(err,data){
        if (err){
            console.log(err);
        }
        callback(JSON.parse(data))});
}

function saveConfig(callback){
    fs.writeFile(configPath, JSON.stringify(config), function (err) {
      if (err) throw err;
      console.log('It\'s saved!');
      callback(callback(0));
  });
}


//======= Read from command line ========//

rl.on('line', function(line) {
    switch(line.trim()) {
        case 'exit':
        rl.close();
        break;

        case 'stop':
        stopServer();
        break;

        case 'status':
        console.log(config);
        break;

        case 'help': // TODO: Print help
        break;

        case 'name':
        console.log(config.name);
        break;

        case 'connect':
        connect();
        break;

        case 'disconnect':
        disconnect();
        break;

        default:
        var rs = line.split(" ");

        if(rs[0] == 'start' && (rs[1] =='server' || rs[1] == '-s')){
            startServer();
            break;
        }
        if(config.connected){
            client.write(crypto.encrypt(line));
            rl.prompt(true);
            break;
        }else{
            console.log('Echo aka you are offline: `' + line.trim() + '`');
        }break;
    }
    rl.prompt(true);
});

rl.on('close', function() {
    disconnect();
    stopServer();
    saveConfig(process.exit);
    console.log('Have a great day!');
});



// ============= CLIENT CODE ============= //

function connect(){
    console.log("Trying to connect to " + config.remotePort + ":" + config.REMOTE);
    client.connect(config.remotePort, config.REMOTE, function(){
        console.log('Connected to server');
        config.connected = true;
        rl.prompt(true);
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
    // rl.prompt();
});

client.on('close', function(){
    if(config.connected){
        console.log("woops, seems we lost connection...");
        rl.prompt(true);
    }
    config.connected = false;
    // console.log('Disconnected from ' + client.remoteAddress);
});

function disconnect(){
    console.log("Disconnected from remote client");
    config.connected = false;
    client.end();
}




// ============= SERVER CODE ============= //

var server = net.createServer(function(client){
    console.log('SERVER > ' + client.address().address + ' is connected');
    rl.prompt(true);
    client.on('end', function(){
        console.log('SERVER > wops, ' + client.address().address + ' has disappeared');
    });

    client.write(" > " + config.name + ": Hi! We are connected!" );
    rl.write('');

    client.on('data', function(data){
        logD(2, "Cipher: " + data);
        rl.write(''); // Hack to refresh 
        console.log(crypto.decrypt(data.toString()));
        rl.prompt(true);
    })
});

server.on('close', function(){
    logD(2, "Close event emitted.");
})

function stopServer(){
    console.log("Stopping server...");
    config.serverRunning = false;
    server.close();
}

function startServer(){
    config.serverRunning = true;
    server.listen(config.localPort, config.HOST, function(){ // Viktig at denne porten er forskjellig!
        if(server.address().address == '::'){
            console.log('Hostname: ' + os.hostname());
            console.log('Server running on ' + config.HOST + ":" + server.address().port);
        }else {
            console.log('Server running on ' + server.address().address + ":" + server.address().port);
        }
        rl.prompt(true);

    });
}




// ============= HELPER METHODS ============= //

function completer(line) {
    var completions = '.help .error .exit .quit .q'.split(' ')
    var hits = completions.filter(function(c) { return c.indexOf(line) == 0 })
    // show all completions if none found
    return [hits.length ? hits : completions, line]
}

function setName(name){
    config.name = name;
    rl.setPrompt(" > " + config.name + ": ");
}

function logD(code, string){
    if(code == 1){
        console.log(">> " + string);
    }

    if(code == 2 && DEBUG){
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
    }
    )}