var net = require('net');
var os = require('os');

var acceptedHosts = [{
	name: 'test',
	address: '::ffff:127.0.0.1',
	port: '9999'
},{ 
	name: 'rikard',
	address: '169.254.254.185',
	port: '1234'
},{
	name: 'siri',
	address: '169.254.13.106',
	port: '4321'
}];

// Create lookup object
var lookup = {};
for (var i = 0; i < acceptedHosts.length; i++){
	lookup[acceptedHosts[i].address] = acceptedHosts[i];
}


var server = net.createServer(function(client){
	console.log('Request from: ' + client.address().address);

	console.log(client.address());

	if(typeof lookup[client.address().address] === 'undefined'){
		console.log("not a recognized client... Ending connection");
		client.end();
	}else{
		console.log('Recognized client: ' + lookup[client.address().address].name);
		client.write('Welcome to very secure chat server');
	}

	client.on('end', function(){
		console.log(client.address().address + ' disconnected.');
	});

	client.on('data', function(data){
		console.log(data.toString());
		client.write('Hei, jeg har det bra. Jeg er ikke robot.');
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