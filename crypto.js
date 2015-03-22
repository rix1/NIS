//====== Encryption and decryption ======//

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  getNonce: getNonce,
  encryptFile: encryptFile,
  decryptFile: decryptFile
}

// Nodejs encryption with CTR
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',   
    password = 'd6F3Efeq'; // Defaults if no password is given 
    zlib = require('zlib'),
    fs = require('fs');

function encrypt(text, password, callback){
  var cipher = crypto.createCipher(algorithm,password)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  callback(crypted);
}

function decrypt(text, password, callback){
  var decipher = crypto.createDecipher(algorithm,password)
  var dec = decipher.update(text,'hex','utf8')
  dec += decipher.final('utf8');
  callback(dec);
}

function encryptFile(file, password, callback){
  var read = fs.createReadStream(file);
  var zip = zlib.createGzip();
  var encryptFile = crypto.createCipher(algorithm, password);
  var encryptedFile = read.pipe(zip).pipe(encryptFile);
  callback(encryptedFile);

//  == testing ==
 // var write = fs.createWriteStream('encrypted_' + file);  
 // var encryptedFile = read.pipe(zip).pipe(encryptFile).pipe(write);
}

function decryptFile(file, password, callback){
  var decrypt = crypto.createDecipher(algorithm, password)
  var unzip = zlib.createGunzip();
  var write = fs.createWriteStream('decrypted_' + file);  
  var decryptedFile = encryptFile(file).pipe(decrypt).pipe(unzip).pipe(write);
  callback(decryptedFile);
}

// //  == testing ==
//  encryptFile('file.txt', password, function(file){
//   console.log("encrypted: " +JSON.stringify(file));
//   var decrypt = crypto.createDecipher(algorithm, password)
//   var unzip = zlib.createGunzip();

//   var sendEmulate = JSON.stringify(file);

//   var receiveEmulate = JSON.parse(sendEmulate);
//   var a = receiveEmulate.pipe(decrypt).pipe(unzip);

//   console.log("Decrypted: " + JSON.stringify(a));


//  });
//  decryptFile('img.jpg');

function getNonce(callback){
  crypto.randomBytes(48, function(ex, buf) {
    var nonce = buf.toString('hex');
    // console.log('inside getNonce ' + callback(nonce));
    callback(nonce);
  });
}