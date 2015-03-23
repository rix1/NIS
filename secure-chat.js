var net = require('net');
var readline = require('readline');
var os = require('os');
var crypto = require('./crypto');
var fs = require('fs');
var path = require('path');


/**
 * Chat client
 *
 * Consists of two parts:
 *  - A sending client
 *  - A receiving server
 *
 *  The external config.json has the following flags with default values:
 *  - serverRunning: false
 *  - connected: false
 *  - clientConnection: false
 *  - secureConnection: false
 *
 *  The server decides who should ask the authentication server
 *  for keys based on these flags.
 *
 *  If a client crashes and won't start,
 *  its because the flags haven't been reset.
 *  Reset them manually in config.json
 *  (or debug_a.json/debug_b.json if running locally).
 *
 *  NOTE:
 *  Auto completion of common commands and help is not finished.
 *  Look below for commands you can use.
 *
 *  HOW TO CONNECT:
 *  - Start server with `node secure-chat.js`
 *  - Select local or external usage:
 *      - If local, select which client A or B you want to be.
 *  - Make sure authentication server is running
 *  - Make sure other client is running
 *  - Type `connect` in order to connect to the other host specified in config.json
 *  - For information about your connection, simply type `status` when the program is running.
 *
 * Also: Next time I write a description like this, I'll make it a poem.
 */


//======= Variables ========//

var configPath;
var config;

var DEBUG = false;
var megaVerboseDebug = false; // Set this if you want info about everything
var client = new net.Socket();
var started = false;var re = /\d{4}/ // 4 digit regex matching


var welcomeAscii =
    "        __      __         .__                                       __                   \n" +
    "       /  \\    /  \\  ____  |  |    ____    ____    _____    ____   _/  |_   ____          \n" +
    "       \\   \\/\\/   /_/ __ \\ |  |  _/ ___\\  /  _ \\  /     \\ _/ __ \\  \\   __\\ /  _ \\         \n" +
    "        \\        / \\  ___/ |  |__\\  \\___ (  <_> )|  Y Y  \\\\  ___/   |  |  (  <_> )        \n" +
    "         \\__/\\  /   \\___  >|____/ \\___  > \\____/ |__|_|  / \\___  >  |__|   \\____/         \n" +
    "              \\/        \\/            \\/               \\/      \\/                         \n" +
    "  _________                                                        .__               __   \n" +
    " /   _____/  ____    ____   __ __ _______   ____             ____  |  |__  _____   _/  |_ \n" +
    " \\_____  \\ _/ __ \\ _/ ___\\ |  |  \\\\_  __ \\_/ __ \\   ______ _/ ___\\ |  |  \\ \\__  \\  \\   __\\\n" +
    " /        \\\\  ___/ \\  \\___ |  |  / |  | \\/\\  ___/  /_____/ \\  \\___ |   Y  \\ / __ \\_ |  |  \n" +
    "/_______  / \\___  > \\___  >|____/  |__|    \\___  >          \\___  >|___|  /(____  / |__|  \n" +
    "        \\/      \\/      \\/                     \\/               \\/      \\/      \\/        \n";




// ============= STARTING APP ============= //

rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.write('');
rl.prompt(true);

if(!started){

    logD(4, "\n"+ welcomeAscii + '\n');

    var usage;
    rl.question("Local connections (1) (debug/testing) or outgoing connection (2)?\n> ", function(answer){
        usage = answer.trim();

        if(usage == 1){
            DEBUG = true;
            var user;
            rl.question("Debug mode selected. User a or b?\n> ", function (answer) {
                user = answer.trim();
                configPath = path.join(__dirname, 'debug_' + user + '.json');
                getConfig(setConfig);
                rl.write('');
                rl.prompt(true);
            });
        }else{
            DEBUG = false;
            logD(1, "Remember to set correct settings in config.json!");
            configPath = path.join(__dirname, 'config.json');
            getConfig(setConfig);
        }
        started = true;
    });
}
// ~~~~~~~~~~~~ end start app ~~~~~~~~~~~~ //




//======= I/O CONFIG ========//

// from local .json files

function setConfig(config1){
    config = config1;

    // Start server automatically
    startServer();
}

function getConfig(callback){
    fs.readFile(configPath, function(err,data){
        if (err){
            logD(1, "Couldn't load config: " + err);
        }
        callback(JSON.parse(data))});
}

function saveConfig(callback){
    fs.writeFile(configPath, JSON.stringify(config), function (err) {
        if (err) throw err;
        logD(5, 'Config saved!');
        callback(callback(0));
    });
}

// ~~~~~~~~~~~~ end I/O ~~~~~~~~~~~~ //




//======= Read from command line ========//

// This is not complete, but works.
// See below for possible input commands.

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

        case 'help':
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

            if(rs[0] == 'start' && (rs[1] =='server' || rs[1] == '-s') && !config.serverRunning){
                startServer();
                break;
            }
            if(config.connected && config.clientConnection && config.secureConnection){
                logD(3,line);
                crypto.encrypt(line, config.sessionKey, function(cipher){
                    client.write(cipher);
                    logD(2, "SEND cipher text: " + cipher);
                });
                break;
            }else{
                logD(1,'OFFLINE. Not sent: `' + line.trim() + '`');
            }break;
    }
    rl.write('');
    rl.prompt(true);
});

rl.on('close', function() {
    if(started) {
        config.serverRunning = false;
        config.connected = false;
        config.clientConnection = false;
        config.secureConnection = false;

        disconnect();
        stopServer();
    }
    saveConfig(process.exit);
    logD(1, 'Goodbye! Have a great day!');
});

// ~~~~~~~~~~~~ end read from command line~~~~~~~~~~~~ //




// ============= CLIENT CODE ============= //

function connect(callback){
    logD(1,"Trying to connect to " + config.REMOTE.address + ":" + config.REMOTE.port);
    client.connect(config.REMOTE.port, config.REMOTE.address, function(){
        logD(1,'Connected to server');

        if(!config.connected){ // Means you are not connected to anyone
            if(!config.clientConnection){ // Means that no one is connected to you and you are the first one to make a connection
                logD(5, "This is the first connection and the first message");

                // Generate first nonce and add it to the message (Message 1 in the protocol)
                crypto.getNonce(function(nonce){
                    logD(2, "NonceA generated: " + nonce);

                    if(DEBUG){
                        // Don't touch these addresses, they're different so
                        // that the auth server can differentiate between two clients on localhost
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
                    logD(5, "Sending FIRST message to other client");
                    logD(5, JSON.stringify(msg));
                    client.write(JSON.stringify(msg));
                });
            }else{
                logD(5, "Someone is already connected to you. You should send them the session key");
                callback();
            }
        }
        config.connected = true;
        rl.write('');
        rl.prompt(true);
    });
}

client.on('error', function(e){
    if(e.code == 'ECONNREFUSED'){
        logD(1, "Cannot connect to server: " + e);
    }
});

client.on('data', function(data){
    rl.write('');
    rl.prompt(true);
    logD(4, data);
});

client.on('close', function(){
    if(config.connected){
        logD(1,"Connection lost. Please reconnect.");
        rl.write('');
        rl.prompt(true);
    }
    config.connected = false;
});

function disconnect(){
    logD(1,"Disconnected from remote client");
    config.connected = false;
    config.clientConnection = false;
    config.secureConnection = false;
    client.end();
}

// ~~~~~~~~~~~~ end client code ~~~~~~~~~~~~ //




// ============= SERVER CODE ============= //

var server = net.createServer(function(client){
    logD(5,'SERVER > ' + client.address().address + ' is trying to connect');


    // When receiving data from the client
    config.clientConnection = true;

    client.on('data', function(data){

        // If someone is connected to you and you are not connected to anything - send msg to auth server.
        if(config.clientConnection && !config.connected){
            client.write("Initiating secure protocol...");
            var parsed = JSON.parse(data);
            logD(5, "Message from other client: " + data);
            logD(5, "Redirecting message to auth server...");


            // Spawn new client in order to connect to the auth server.
            var authClient = new net.Socket();
            authClient.connect(config.authServer.port, config.authServer.address, function(){
                logD(5, 'Connected to Auth Server');

                // Generate own nonce and add it to the message (Message 2 in the protocol)
                crypto.getNonce(function(nonce){
                    parsed.destination.nonce = nonce;
                    config.nonce = nonce;
                    var send = JSON.stringify(parsed);
                    logD(2, "NonceB generated: " + nonce);
                    logD(5, "NonceB generated. Sending the following message to auth server:\n" + send);
                    authClient.write(send);
                })
            });

            // Data received from auth server
            authClient.on('data', function(data){
                rl.write('');
                rl.prompt(true);

                var response = JSON.parse(data);

                logD(5, "AUTHSERVER responds: " + data);
                if(response.status < 400){
                    logD(5, "Response from auth server successful");
                    if(response.status == 200){

                        // Decrypt your part of the message. If successful forward message to other party.
                        decryptAndVerify(response.destination, function(verified){
                            if(verified){
                                config.secureConnection = true;
                                connectAndWrite(response.source); // Connect and write data back to Alice
                                logD(1, "Secure connection established");
                            }else{
                                logD(5, "FATAL: Nonce or decryption cannot be completed.");
                                logD(1, "Could not verify data from auth server. Other party or nonces may be corrupted.");
                                // End all connections.
                                authClient.end();
                                disconnect();
                            }
                        });
                        authClient.end();
                    }
                }else{
                    logD(1, "Authentication server don't recognize all clients:");
                    logD(1, response.status + ": " + response.response);
                }
            });

            // You receive data from the client but a secure connection is not established
        }else if(config.clientConnection && config.connected && !config.secureConnection) {
            logD(2, "RECEIVED cipher: " + data);
            var test2 = data + '';
            decryptAndVerify(test2, function(verified){
                if(verified){
                    config.secureConnection = true;
                    logD(1, "Secure connection established");
                }else{
                    logD(2, "FATAL: Nonce or decryption cannot be completed.");
                    client.end();
                    disconnect();   
                }
            });
        }else if(config.secureConnection){
            logD(2, "Received cipher: " + data);

            crypto.decrypt(data + '', config.sessionKey, function(plain){
                logD(4, plain);
            });
        }
        else{
            logD(5, "WHAAT - U NOT SUPPOSED TO AVOID EVERY TEST");
        }
    });

    client.on('end', function(){
        config.clientConnection = false;
        config.secureConnection = false;
        logD(1,'Client ' + client.address().address + ' has disappeared');
    });
});

server.on('close', function(){
    logD(5, "Close event emitted.");
})

function stopServer(){
    logD(1,"Stopping server...");
    config.serverRunning = false;
    server.close();
}

// Start server
function startServer(){
    config.serverRunning = true;
    // logD(2, "Starting server...");
    server.listen(config.HOST.port, config.HOST.address, function(){
        if(server.address().address == '::'){
            logD(2,'Server started on ' + config.HOST.address + ":" + server.address().port);
        }else {
            logD(2,'Server started on ' + server.address().address + ":" + server.address().port);
        }
        rl.write('');
        rl.prompt(true);
    });
}

// ~~~~~~~~~~~~ end server code ~~~~~~~~~~~~ //




// ============= HELPER METHODS ============= //


function connectAndWrite(data){
    connect(function(){ // Connected
        client.write(data);
    });
}

// See crypto.js for details
function decryptAndVerify(cipher, callback){
    var plaintext;

    crypto.decrypt(cipher, config.secretKey, function(dec){
        plaintext = JSON.parse(dec);
        if(plaintext.nonce == config.nonce){
            config.sessionKey = plaintext.sessionKey;
            callback(true);
        }else {
            logD(2, "FATAL: Nonces does not match:");
            logD(2, plaintext.nonce);
            logD(2, config.nonce);
            callback(false);
        }
    });
}

// Print options
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
    }else if(code == 5 && megaVerboseDebug){
        console.log('Verbose: ' + string);
    }
    rl.write('');
    rl.prompt(true);
}


// Not complete
function completer(line) {
    var completions = '.help .error .exit .quit .q'.split(' ')
    var hits = completions.filter(function(c) { return c.indexOf(line) == 0 })
    // show all completions if none found
    return [hits.length ? hits : completions, line]
}

// Not used
function setName(name){
    config.name = name;
    rl.setPrompt(" > " + config.name + ": ");
}


var re = /\d{4}/ // 4 digit regex matching

// @deprecated.
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
            }}
    )}