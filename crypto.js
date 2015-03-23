

/**
 * Encryption and decryption
 *
 * Functions that are available to other classes:
 * @type {{encrypt: encrypt, decrypt: decrypt, getNonce: getNonce, encryptFile: encryptFile, decryptFile: decryptFile}}
 *
 * Uses AES-256 Encryption
 * Session key and nonces are genereated by random bytes
 * See https://nodejs.org/api/crypto.html for details.
 *
 */

module.exports = {
  encrypt: encrypt,
  decrypt: decrypt,
  getNonce: getNonce,
  encryptFile: encryptFile,
  decryptFile: decryptFile
}

// Define encryption/decryption
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',   
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
}

function decryptFile(file, password, callback){
  var decrypt = crypto.createDecipher(algorithm, password)
  var unzip = zlib.createGunzip();
  var write = fs.createWriteStream('decrypted_' + file);  
  var decryptedFile = encryptFile(file).pipe(decrypt).pipe(unzip).pipe(write);
  callback(decryptedFile);
}

function getNonce(callback){
  crypto.randomBytes(48, function(ex, buf) {
    var nonce = buf.toString('hex');
    callback(nonce);
  });
}