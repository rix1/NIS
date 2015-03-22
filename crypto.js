//====== Encryption and decryption ======//

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt
}

// Nodejs encryption with CTR
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',   
    password = 'd6F3Efeq',
    config = {
  "serverRunning": false,
  "connected": false,
  "remotePort": "4321",
  "localPort": "1234",
  "name": "OHAI",
  "HOST": "169.254.193.97",
  "REMOTE": "169.254.13.106"
}

function getPassword(){
  //return Kas for A, Na 
  //return Kbs for B, Nb
  //return Kab for A and B
}

function encrypt(text){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted;
}
 
function decrypt(text){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  return dec;
}

function getNonce(callback){
  crypto.randomBytes(48, function(ex, buf) {
    var nonce = buf.toString('hex');
    // console.log('inside getNonce ' + callback(nonce));
    return callback(nonce) + ' gunnar';
  });
}

function startProtocol(nonce){
  var msg = {
    "localAddress": config.HOST, 
    "remoteAddress": config.REMOTE,
    "nonce": nonce 
  }
  config.nonce = nonce;
  console.log('ooonnce: ' + nonce);

  return 'hei';
}

function print(){
  console.log(getNonce(startProtocol, function(callback){
    console.log('inni print, hva skjer?');
    callback();
  }) + ', hvordan går det?');  
}

print();


function validateNonce(nonce){
  if(config.nonce == nonce){
    console.log('true');
  }
}

validateNonce();

 
//====== Encryption and decryption ======//

