var net = require('net');
var os = require('os');
var crypto = require('./crypto');

var acceptedHosts = [{
	"name": 'test',
	"address": '127.0.0.10',
	"KEY": "fo86TVohnvhXoPKEL9x4ZEZPXaJucfG"
},{ 
	"name": 'Rikard',
	"address": '169.254.106.67',
	"KEY": "Pke4TVohnvhXEL9x4ZEZPXaVcNcdUoPKWiXzfo86JucfG6W7n"
},{
	"name": 'Siri',
	"address": '169.254.13.106',
	"KEY": "GfYb$cP6ZXkyL[RLnDLU4Rq2;>8nq;}Yv7C8gxZBM)RwhZ9KDE"
}];

// Create lookup object
var lookup = {};
for (var i = 0; i < acceptedHosts.length; i++){
	lookup[acceptedHosts[i].address] = acceptedHosts[i];
}

var server = net.createServer(function(client){
	console.log('Request from: ' + client.address().address);

	var welcome = { "status": "100", "response": "connected to auth server"}
	// client.write(JSON.stringify(welcome));

	client.on('end', function(){
		console.log(client.address().address + ' disconnected.');
	});

	client.on('data', function(data){
		var msg = JSON.parse(data);		
		console.log("Data received from client: "+ data);

		console.log("Address1: "+ lookup[msg.source.address].name);
		console.log("Address: "+ lookup[msg.destination.address].name);


		// Verify (again) that both addresses are known to the auth server
		if(typeof lookup[msg.source.address] === 'undefined' ||  typeof lookup[msg.destination.address] === 'undefined'){
			console.log("A: " + lookup[msg.source.address]);
			console.log("B: " + lookup[msg.destination.address]);
			console.log("not a recognized client... Ending connection");

			var err = { "status": "400", "response": "ERROR: Address not known"};
			client.write(JSON.stringify(err)); // For security reasons, do not specify which address is known.
			client.end();
		}else{
			// Create two packages, encrypt them separately and send them back.
			// I propose the following message to be returned

			// Generate a session key
			crypto.getNonce(function(sharedKey){
				console.log("Shared key generated...: " + sharedKey);
				var source = {"nonce": msg.source.nonce, "address": msg.source.address, "otherAddress": msg.destination.address, "sharedKey": sharedKey};
				var destination = {"nonce": msg.destination.nonce, "address": msg.destination.address, "otherAddress": msg.source.address, "sharedKey": sharedKey};

				console.log("Fields before encryption: " + JSON.stringify(source) +"\n" + JSON.stringify(destination));

				encryptFields(source, destination, function(msg){
					console.log("Fields encrypted... Returning to client");
					msg.status = "200";
					client.write(JSON.stringify(msg));
					console.log("Encrypted message: " + JSON.stringify(msg));
				})
			});
		}
	});
});

function encryptFields(source, dest, callback){
	var msg = { source: {}, destination: {}};
	console.log("KEYS");
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

server.listen(9999, '169.254.106.67', function(){
	if(server.address().address == '::'){
		console.log('Hostname: ' + os.hostname());
		console.log('Server running on 127.0.0.1:' + server.address().port);

	}else {
		console.log('Server running on ' + server.address().address + ":" + server.address().port);
	}
});