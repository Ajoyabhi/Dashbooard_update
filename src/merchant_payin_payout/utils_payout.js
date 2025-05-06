const crypto = require('crypto');

async function encryptText(plainText, key, aesIv) {
    // console.log("plainText", plainText)
    const iv = aesIv; // Generate a random 16-character IV
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(plainText, "utf8", "hex");
    // console.log("encrypted to hex", encrypted);
    encrypted += cipher.final("hex");
    // console.log("encrypted to hex final", encrypted);

    // Combine IV and encrypted data
    const encryptedText = encrypted;

    return encryptedText;
  }

module.exports = {
    encryptText
}