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
            logD(3,line);
            break;
        }else{
            logD(1,'Echo aka you are offline: `' + line.trim() + '`');
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
    logD(1,"Trying to connect to " + config.remotePort + ":" + config.REMOTE);
    client.connect(config.remotePort, config.REMOTE, function(){
        logD(1,'Connected to server');

        if(!config.clientConnection){ // Means no client is connected to you
            // This is the first message. Send nonces.
            logD(2, "This is the first connection and the first message");
        }else{
            logD(2, "Someone is already connected to you. You should send them the shared key");
            // If connected to, this is an automatic call made from the forwarding function
            // Foreward message from server
        }
        config.connected = true;
    });
}

client.on('error', function(e){
    if(e.code == 'ECONNREFUSED'){
        logD(1, "Cannot connect to server: " + e.code);
    }
});

client.on('data', function(data){
    logD(4, data);
});

client.on('close', function(){
    if(config.connected){
        logD(1,"woops, seems we lost connection...");
        rl.prompt(true);
    }
    config.connected = false;
});

function disconnect(){
    logD(1,"Disconnected from remote client");
    config.connected = false;
    client.end();
}

// ============= SERVER CODE ============= //

var server = net.createServer(function(client){
    logD(1,'SERVER > ' + client.address().address + ' is trying to connect');

    if(config.connected == false){
        // This is the responese to the first message in the protocol
        client.write(config.name + " > Hi! You just connected to me. Am I connected to you: " + config.connected );
        client.write(config.name + " > Just hang on, I'll verify you and get a shared key just now-now");

        config.clientConnection = true; // A client is now connected to you
        
        // TODO: Redirect message to auth server

        // Auth server responds
        if(true){

        }
    }else{
        // This is later messages in the protocol
    }


    client.on('data', function(data){
        logD(2, "Cipher: " + data);
        logD(4,crypto.decrypt(data.toString()));
    })

    client.on('end', function(){
        config.clientConnection = false;
        logD(1,' wops, ' + client.address().address + ' has disappeared');
    });
});

server.on('close', function(){
    logD(2, "Close event emitted.");
})

function stopServer(){
    logD(1,"Stopping server...");
    config.serverRunning = false;
    server.close();
}

function startServer(){
    config.serverRunning = true;
    server.listen(config.localPort, config.HOST, function(){ // Viktig at denne porten er forskjellig!
        if(server.address().address == '::'){
            logD(2,'Hostname: ' + os.hostname());
            logD(2,'Server running on ' + config.HOST + ":" + server.address().port);
        }else {
            logD(2,'Server running on ' + server.address().address + ":" + server.address().port);
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
    else if(code == 2 && DEBUG){
        console.log("APP: " + string);
    }else if(code == 3){
        console.log(config.name + '> ' + string);
    }else if(code == 4){
        console.log('' + string);
    }
    rl.prompt(true);
    rl.write('');
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