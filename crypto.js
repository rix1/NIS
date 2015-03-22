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

// test();

function test(){
  var cip = "381740844b6bc29ea0960880afa31d1e0aad625b345c75062fd067cad2265337de306ecb81f84bab94365f3cdd1b47dd456f446d4938c10c9344254dfd48670e85f463d56dddd0eb8fe2c24d6395938fa5121e8207be6fb3b1a24627582ef54f5b84b48f18df58e8454b2adecb11bc99658fb7ba6ccb85c0f20c14f88e11924270dc75bfd6983b91758333c67b4b5426cbe28cef823444849fe640d2de4426141a33f408672b050dbdbd358b4b3413315130d78f26aaec5e6775b7d517c367b5e640d383f45b44a72fbacaf36c6475622441ff1d3b57a0cc3ad89b9fe981fd1c29f67026f51c6e715a8d6eed5de511e9059cd2b4c253f3ebd6e5c06e1878d9ffc5cde1497a24cc33853fd45c";
  var key = "Pke4TVohnvhXEL9x4ZEZPXaVcNcdUoPKWiXzfo86JucfG6W7n";
  decrypt(cip, key, function(t){
    console.log(t);
  })
}

function encryptFile(file, password, callback){
  var read = fs.createReadStream(file);
  var zip = zlib.createGzip();
  var encryptFile = crypto.createCipher(algorithm, password);
  var encryptedFile = read.pipe(zip).pipe(encryptFile);
  callback(encryptedFile);

//  == testing ==
//  var write = fs.createWriteStream('encrypted_' + file);  
//  var encryptedFile = read.pipe(zip).pipe(encryptFile).pipe(write);
}

function decryptFile(file, password, callback){
  var decrypt = crypto.createDecipher(algorithm, password)
  var unzip = zlib.createGunzip();
  var write = fs.createWriteStream('decrypted_' + file);  
  var decryptedFile = encryptFile(file).pipe(decrypt).pipe(unzip).pipe(write);
  callback(decryptedFile);
}

//  == testing ==
//  encryptFile('img.jpg');
//  decryptFile('img.jpg');

function getNonce(callback){
  crypto.randomBytes(48, function(ex, buf) {
    var nonce = buf.toString('hex');
    // console.log('inside getNonce ' + callback(nonce));
    callback(nonce);
  });
}