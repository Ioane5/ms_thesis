import forge from 'node-forge'

export default class Security {

    constructor(publicKey, privateKey) {
        this.userPublicKeyString = publicKey;
        this.userPublicKey = this.stringToPublicKey(publicKey);
        this.userPrivateKey = this.stringToPrivateKey(privateKey);
    }

    encrypt(dataString, accessKeys) {
        console.log('encrypting', dataString, accessKeys);
        console.log('userPrivateKey', this.userPrivateKey);
        // First create signature of the data itself.
        let md = forge.md.sha1.create();
        md.update(dataString, 'utf8');
        let signature = this.userPrivateKey.sign(md);
        console.log('signature', signature);
        // The actual data that will be encrypted
        let messageDataString = JSON.stringify(new MessageData(dataString, signature, this.userPublicKeyString));
        // generate a random key and IV
        let messageKey = forge.random.getBytesSync(16);
        let messageIV = forge.random.getBytesSync(8);
        console.log('keys', messageKey, messageIV);
        console.log('buffer', forge.util.createBuffer(dataString, 'utf8'));
        // encrypt data string
        let cipher = forge.cipher.createCipher('AES-CBC', messageKey);
        cipher.start({iv: messageIV});
        cipher.update(forge.util.createBuffer(messageDataString, 'utf8'));
        cipher.finish();
        let encrypted = forge.util.encode64(cipher.output.bytes()).toString();
        console.log('encrypted', encrypted);

        let messageAESKey = JSON.stringify([forge.util.encode64(messageKey), forge.util.encode64(messageIV)]);
        console.log('messageAESKey', messageAESKey);
        let messageKeys = {};
        accessKeys.forEach((publicKey) => {
            // User Key -> Encrypted Key, and IV vector that only user can unlock
            messageKeys[publicKey] = this.stringToPublicKey(publicKey).encrypt(messageAESKey);
        });
        return new Message(encrypted, messageKeys);
    }

    decrypt(message) {
        console.log('encryptedData', message.encryptedData);
        let encryptedData = forge.util.createBuffer(forge.util.decode64(message.encryptedData));
        let encryptedMessageAESKey = message.accessKeys[this.userPublicKeyString];
        console.log('encryptedMessageAESKey', encryptedMessageAESKey);
        // first decrypt AES key pair
        let messageAESKey = JSON.parse(this.userPrivateKey.decrypt(encryptedMessageAESKey));
        console.log('before decoding', messageAESKey);
        messageAESKey = messageAESKey.map((e) => {
            return forge.util.decode64(e);
        });
        console.log('decryptedMessageAESKey', messageAESKey);
        // then decrypt a message
        let cipher = forge.cipher.createDecipher('AES-CBC', messageAESKey[0]);
        cipher.start({iv: messageAESKey[1]});
        cipher.update(encryptedData);
        cipher.finish();

        let messageDataString = cipher.output.toString('utf8');
        console.log('messageDataString', messageDataString);
        let messageData = JSON.parse(messageDataString);
        let dataString = messageData.data.toString();
        let signedBy = messageData.signedBy;
        let signature = messageData.signature;
        // Verify signature
        let md = forge.md.sha1.create();
        md.update(dataString, 'utf8');
        let verified = this.stringToPublicKey(signedBy).verify(md.digest().bytes(), signature);
        console.log('verified', verified);

        if (!verified) {
            return null;
        }
        return [dataString, signedBy];
    }

    stringToPublicKey(publicKey) {
        return forge.pki.publicKeyFromPem('-----BEGIN PUBLIC KEY-----' + publicKey + '-----END PUBLIC KEY-----');
    }

    stringToPrivateKey(privateKey) {
        return forge.pki.privateKeyFromPem('-----BEGIN PRIVATE KEY-----' + privateKey + '-----END PRIVATE KEY-----');
    }
}


class Message {
    constructor(encryptedData, accessKeys) {
        this.encryptedData = encryptedData;
        this.accessKeys = accessKeys;
    }
}

/**
 * Data that will be encrypted and put into a message
 */
class MessageData {
    constructor(data, signature, signedBy) {
        this.data = data;
        this.signature = signature;
        this.signedBy = signedBy;
    }
}