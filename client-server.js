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
        if(config.connected && config.clientConnection && config.secureConnection){
            logD(3,line);
            crypto.encrypt(line, config.sharedKey, function(cipher){
                client.write(cipher);
                logD(2, "Sent cipher text: " + cipher);
            });
            break;
        }else{
            logD(1,'Echo aka you are offline: `' + line.trim() + '`');
        }break;
    }
    rl.prompt(true);
});

rl.on('close', function() {
    config.connected = false,
    config.clientConnection = false,
    config.secureConnection = false,

    disconnect();
    stopServer();
    saveConfig(process.exit);
    console.log('Have a great day!');
});



// ============= CLIENT CODE ============= //

function connect(callback){
    logD(1,"Trying to connect to " + config.REMOTE.address + ":" + config.REMOTE.port);
    client.connect(config.REMOTE.port, config.REMOTE.address, function(){
        logD(1,'Connected to server');

        if(!config.connected){ // Means you are not connected to anyone

            if(!config.clientConnection){ // Means that no one is connected to you and you are the first one to make a connection

                logD(2, "This is the first connection and the first message");
                crypto.getNonce(function(nonce){

                    if(DEBUG){
                        var msg = {
                            "source": {"address": "127.9.9.9", "nonce": nonce},
                            "destination": {"address": "127.0.0.1", "nonce": ""}
                        }                    
                    }else{
                        var msg = {
                            "source": {"address": config.HOST.address, "nonce": nonce},
                            "destination": {"address": config.REMOTE.address, "nonce": ""}
                        }
                    }
                    config.nonce = nonce;
                    logD(2, "Sending FIRST message to other client");
                    logD(2, JSON.stringify(msg));        
                    client.write(JSON.stringify(msg));
                });
            }else{
                logD(2, "Someone is already connected to you. You should send them the shared key");
                callback();
            }
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
    config.secureConnection = false;
    client.end();
}

function connectAndWrite(data){
    connect(function(){ // Connected
        client.write(data);
    });
}

// ============= SERVER CODE ============= //

var server = net.createServer(function(client){
    logD(1,'SERVER > ' + client.address().address + ' is trying to connect');

    // if(!config.connected){
        // This is the responese to the first message in the protocol
        // client.write(config.name + " > Hi! You just connected to me. Am I connected to you: " + config.connected );
        // client.write(config.name + " > Just hang on, I'll verify you and get a shared key just now-now");
        config.clientConnection = true; // A client is now connected to you
        
        // TODO: Redirect message to auth server

        // Auth server responds
    // }else{
        // This is later messages in the protocol
    // }


    client.on('data', function(data){     
        if(config.clientConnection && !config.connected){ // If someone is connected to this and this is not connected to anything - send msg to auth server.
            client.write("Initiating secure protocol...");
            // This is probably the first message - better check with auth-server if party is recognized
            var parsed = JSON.parse(data);
            logD(2, "Message from other client: " + data);
            logD(2, "Redirecting message to auth server...");


            // SPAWN NEW CONNECTION TO AUTH SERVER
            var authClient = new net.Socket();
            authClient.connect(config.authServer.port, config.authServer.address, function(){
                logD(2, 'Connected to Auth Server');

                crypto.getNonce(function(nonce){
                    parsed.destination.nonce = nonce;
                    config.nonce = nonce;
                    var send = JSON.stringify(parsed);
                    logD(2, "NonceB generated. Sending the following message to auth server:\n" + send);
                    authClient.write(send);
                })
            });

            authClient.on('data', function(data){
                var response = JSON.parse(data);
                logD(2, "AUTHSERVER responds: " + data);
                if(response.status < 400){
                    logD(2, "Response from auth server succsessfull");
                    if(response.status == 200){
                        decryptAndVerify(response.destination, function(verified){
                            if(verified){
                                config.secureConnection = true;
                                connectAndWrite(response.source); // Connect and write data back to Alice        
                            }else{
                                logD(2, "FATAL: Nonce or decryption cannot be completed.");
                            // TODO: Something.
                        }
                    })
                        authClient.end();
                    }
                }else{
                    logD(1, response.status + ": " + response.response);
                }
            });

        }else if(config.clientConnection && config.connected && !config.secureConnection) { // You receive data from the client
            logD(2, "Received cipher: " + data); 
            var test2 = data + '';
            decryptAndVerify(test2, function(verified){
                if(verified){
                    config.secureConnection = true;
                    logD(1, "Secure connection established");
                }else{
                    logD(2, "FATAL: Nonce or decryption cannot be completed.");
                }
            });
        }else if(config.secureConnection){
            logD(2, "Received cipher: " + data);
            
            crypto.decrypt(data + '', config.sharedKey, function(plain){
                logD(4, plain);
            });
        }
        else{
            logD(2, "WHAAT - U NOT SUPPOSED TO AVOID EVERY TEST");
        }
    });

client.on('end', function(){
    config.clientConnection = false;
    config.secureConnection = false;
    logD(1,' wops, ' + client.address().address + ' has disappeared');
});
});

function decryptAndVerify(cipher, callback){
    var plaintext;

    crypto.decrypt(cipher, config.secretKey, function(dec){

        plaintext = JSON.parse(dec);

        // plaintext = JSON.parse(dec);
        if(plaintext.nonce == config.nonce){
            config.sharedKey = plaintext.sharedKey;
            callback(true);
        }else {
            logD(2, "FATAL: Nonces does not match:");
            logD(2, plaintext.nonce);
            logD(2, config.nonce);
            callback(false);
        }
    });
}

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
    server.listen(config.HOST.port, config.HOST.address, function(){ // Viktig at denne porten er forskjellig!
        if(server.address().address == '::'){
            logD(2,'Hostname: ' + os.hostname());
            logD(2,'Server running on ' + config.HOST.address + ":" + server.address().port);
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