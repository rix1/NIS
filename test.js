

var acceptedHosts = [{
    name: 'rikard',
    address: '127.0.0.1',
    port: '9999'
},{ 
    name: 'siri',
    address: '1235.423',
    port: '1324'
}];

var lookup = {};

for (var i = 0, len = acceptedHosts.length; i < len; i++) {
    lookup[acceptedHosts[i].name] = acceptedHosts[i];
}


var a = 'rikard';
var b = 'sdf';

console.log(lookup[a]);

if(!(typeof lookup[a] === "undefined")){
    console.log("GRANBAR");
}


// function returnFunction(string){
//     if(string == 'hei'){
//         return 'hade';
//     }else {
//         console.log('returnfunction');
//         return 'dust';
//     }
// }


// var usikker = returnFunction('frank');


// var connect = function(firstThing, seconThing){
//     console.log("1: inni connect!");
//     return "first: " + firstThing;

//     var now = function(){
//         return "second" + seconThing;
//     }
// };

// connect("første", "andre");

// console.log(usikker);