
var str = "connect 1234";
var str2 = "connect1234";
var re = /^connect\s\d+$/

console.log( re.test(str) );
console.log( re.test(str2) );


// var re = /\d{4}/

// re.test(ans)


// 	console.log('CONNECTED: ' + client.address().address);

// 	client.on('end', function(){
// 		console.log(client.address().address + ' disconnected.');
// 	});

// 	client.write('Welcome to very secure chat server');

// 	client.on('data', function(data){
// 		console.log(data.toString());
// 		client.write('Hei, jeg har det bra. Jeg er ikke robot.');
// 	});


// test = true;

// log("heisanN!")

// function log(string){
// 	if(test){
// 		console.log(string);
// 	}
// }


function returnFunction(string){
    if(string == 'hei'){
        return 'hade';
    }else {
        console.log('returnfunction');
        return 'dust';
    }
}


var usikker = returnFunction('frank');


var connect = function(firstThing, seconThing){
    console.log("1: inni connect!");
    return "first: " + firstThing;

    var now = function(){
        return "second" + seconThing;
    }
};

connect("første", "andre");

console.log(usikker);