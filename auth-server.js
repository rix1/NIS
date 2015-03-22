var net = require('net');
var os = require('os');

var acceptedHosts = [{
	"name": 'test',
	"address": '127.0.0.10',
	"port": '9999'
},{ 
	"name": 'Alice',
	"address": '127.0.0.11',
	"KEY_A": "Pke4TVohnvhXEL9x4ZEZPXaVcNcdUoPKWiXzfo86JucfG6W7n"
},{
	"name": 'Bob',
	"address": '::ffff:127.0.0.1',
	"KEY_B": "GfYb$cP6ZXkyL[RLnDLU4Rq2;>8nq;}Yv7C8gxZBM)RwhZ9KDE"
}];

// Create lookup object
var lookup = {};
for (var i = 0; i < acceptedHosts.length; i++){
	lookup[acceptedHosts[i].address] = acceptedHosts[i];
}

var server = net.createServer(function(client){
	console.log('Request from: ' + client.address().address);

	if(typeof lookup[client.address().address] === 'undefined'){
		console.log("not a recognized client... Ending connection");
		client.end();
	}else{
		console.log('Recognized client: ' + lookup[client.address().address].name);
		client.write('*in russian accent* Welcome to very secure chat server, my name is Boris');
	}

	client.on('end', function(){
		console.log(client.address().address + ' disconnected.');
	});

	client.on('data', function(data){
		var msg = JSON.parse(data);
		console.log(msg.userA.nonce);
	});
});

server.listen(9999, function(){
	if(server.address().address == '::'){
		console.log('Hostname: ' + os.hostname());
		console.log('Server running on 127.0.0.1:' + server.address().port);

	}else {
		console.log('Server running on ' + server.address().address + ":" + server.address().port);
	}
});