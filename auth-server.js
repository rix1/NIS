var net = require('net');
var os = require('os');
var crypto = require('./crypto');

/**
 * Authorization server
 *
 * aka Trusted thrid party.
 *
 * How to use: Set local flag to either true,
 * or set the following:
 *
 *  - Your IP address .
 *  - The accepted hosts IP addresses.
 *  - New keys for both accepted hosts.
 *
* */

var local = true;
var yourIP = '169.254.106.67';
var acceptedHosts;
var authServer = {};
    authServer.port = 9999;

// Local settings
if(local){
    authServer.address = '127.0.0.1';

    acceptedHosts = [{
        "name": 'Alice',
        "address": '127.9.9.9',
        "KEY": "Pke4TVohnvhXEL9x4ZEZPXaVcNcdUoPKWiXzfo86JucfG6W7n"
    },{
        "name": 'Bob',
        "address": '127.0.0.1',
        "KEY": "GfYb$cP6ZXkyL[RLnDLU4Rq2;>8nq;}Yv7C8gxZBM)RwhZ9KDE"
    }];
    console.log("Local settings set")

// Settings for external connections
}else{
    autServer.address = yourIP;

    acceptedHosts = [{
        "name": 'Rikard',
        "address": yourIP, // <-------- Change this if one client and auth server is not running on same machine
        "KEY": "Pke4TVohnvhXEL9x4ZEZPXaVcNcdUoPKWiXzfo86JucfG6W7n"
    },{
        "name": 'Siri',
        "address": '169.254.13.106',
        "KEY": "GfYb$cP6ZXkyL[RLnDLU4Rq2;>8nq;}Yv7C8gxZBM)RwhZ9KDE"
    }];
    console.log("External settings set")
}



// =========== Define server =========== //

var server = net.createServer(function(client){
    console.log('Request from: ' + client.address().address);

    var welcome = { "status": "100", "response": "connected to auth server"}
    client.write(JSON.stringify(welcome));

    client.on('end', function(){
        console.log(client.address().address + ' disconnected.');
    });

    // When receiving any data from a connected client
    client.on('data', function(data){
        var msg = JSON.parse(data);
        console.log("\nData received from client: "+ data);

        // Print names on clients. Prints 'undefined' if not known.
        console.log("Address1: "+ lookup[msg.source.address].name);
        console.log("Address: "+ lookup[msg.destination.address].name);

        // Logically verify that both addresses are known to the auth server
        if(typeof lookup[msg.source.address] === 'undefined' ||  typeof lookup[msg.destination.address] === 'undefined'){
            console.log("\nA: " + lookup[msg.source.address]);
            console.log("B: " + lookup[msg.destination.address]);
            console.log("--- > not a recognized client... Ending connection");

            var err = { "status": "400", "response": "ERROR: Address not known"};
            client.write(JSON.stringify(err)); // For security reasons, do not specify which address is known.
            client.end();


            // Both addresses in request is known, generating session key and encrypting response:
            // Create two packages, encrypt them separately and send them back.
        }else{
            // Generate a session key
            crypto.getNonce(function(sessionKey){
                console.log("\nShared key generated...: " + sessionKey);
                var source = {"nonce": msg.source.nonce, "address": msg.source.address, "otherAddress": msg.destination.address, "sessionKey": sessionKey};
                var destination = {"nonce": msg.destination.nonce, "address": msg.destination.address, "otherAddress": msg.source.address, "sessionKey": sessionKey};

                console.log("Fields before encryption:\n" + JSON.stringify(source) +"\n" + JSON.stringify(destination));

                encryptFields(source, destination, function(msg){
                    console.log("\nEncrypted message: " + JSON.stringify(msg));
                    msg.status = "200";
                    client.write(JSON.stringify(msg));
                    console.log("\nFields encrypted... Returning to client");

                })
            });
        }
    });
});


// =========== Start server =========== //

server.listen(authServer.port, authServer.address, function(){
    if(server.address().address == '::'){
        console.log('Hostname: ' + os.hostname());
        console.log('Server running on 127.0.0.1:' + server.address().port);

    }else {
        console.log('Server running on ' + server.address().address + ":" + server.address().port);
    }
});


// =========== Helper Methods =========== //

// Create lookup object
var lookup = {};
for (var i = 0; i < acceptedHosts.length; i++){
    lookup[acceptedHosts[i].address] = acceptedHosts[i];
}

// See crypto.js for encryption details

function encryptFields(source, dest, callback){
    var msg = { source: {}, destination: {}};
    console.log("\nEncrypting two fields with the following KEYS");
    console.log("A: " + lookup[source.address].KEY);
    console.log("B: " + lookup[dest.address].KEY);

    crypto.encrypt(JSON.stringify(source), lookup[source.address].KEY, function(cipherS){
        msg.source = cipherS;
        crypto.encrypt(JSON.stringify(dest), lookup[dest.address].KEY, function(cipherD){
            msg.destination = cipherD;
            callback(msg);
        });
    });
}