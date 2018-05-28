import LocalDataController from "./LocalDataController";
import LiveDataController from "./LiveDataController";
import CloudDataController from "./CloudDataController";
import Security from "./Security"

export default class DataController {

    constructor(publicKey, privateKey, liveUrl, liveConfig, cloudUrl) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;

        this.cloudDataController = new CloudDataController(publicKey, privateKey, cloudUrl);
        this.localDataController = new LocalDataController((isSuccess) => {
            if (!isSuccess) {
                console.log('could not initialize local database!');
                return;
            }
            this.liveController = new LiveDataController(publicKey, privateKey, liveUrl, liveConfig);
            this.liveController.onMessageReceived((message) => {
                this.onDataReceived(message);
            });
        });
        this.security = new Security(publicKey, privateKey);
        // this.testCrypt();
    }

    encryptData(data, sharedWith) {
        let dataString = JSON.stringify(data);
        let accessKeys = [this.publicKey];
        if (sharedWith) {
            accessKeys = accessKeys.concat(sharedWith);
        }
        return this.security.encrypt(dataString, accessKeys);
    }

    decryptData(encryptedData) {
        try {
            let decrypt = this.security.decrypt(encryptedData);
            let data = JSON.parse(decrypt[0]);
            console.log('decrypted Data', data);
            let signedBy = decrypt[1];
            if (data.author == signedBy) {
                return data;
            } else {
                console.log('cloud not verify author != signedBy', data.author, signedBy);
                return null;
            }
        } catch (e) {
            console.log('cloud not decrypt', e);
            return null;
        }
    }

    testCrypt() {
        console.log('begin test');
        let data = this.security.encrypt('me mqvia ioane', [this.publicKey]);
        console.log('encrypted', data);
        let decrypted = this.security.decrypt(data);
        console.log('decrypted', decrypted);
        console.log('end test');
    }

    sync() {
        this.cloudDataController.sync((message) => {
            this.onDataReceived(message);
        });
    }

    fetchPublicByKey(key, callback) {
        this.cloudDataController.fetchPublicByKey(key, callback);
    }

    publish(data, callback) {
        this.saveData(data, null, (isSavedLocally) => {
            if (isSavedLocally) {
                this.cloudDataController.publish(data, callback);
            } else {
                callback(false)
            }
        });
    }

    getByKey(key, callback) {
        this.localDataController.getByKey(key, callback);
    }

    getByAuthor(author, callback) {
        this.localDataController.getByAuthor(key, callback);
    }

    saveData(data, sharedWith, callback) {
        // Reset if null
        if (!data['id']) {
            data['id'] = this.uuidv4();
        }
        if (!data['author']) {
            data['author'] = this.publicKey;
        }
        if (!data['created_at']) {
            data['created_at'] = new Date().getTime();
        }
        // Always save in local
        this.localDataController.save(data, callback);
        // Only save in remote if required
        if (sharedWith) {
            // After locally saved, now we can encrypt, if it's private!
            data = this.encryptData(data, sharedWith);
            this.liveController.sendData(data, sharedWith, (success) => {
                console.log('sendData success: ' + success);
                if (!success) {
                    this.cloudDataController.save(data, sharedWith, (success) => {
                        console.log('Object saved in Cloud: ' + success);
                    });
                }
            });
        }
    }

    listenDataChanges(callback) {
        this.dataListener = callback;
    }

    onDataReceived(data) {
        console.log('onDataReceived', data);
        data = this.decryptData(data);
        console.log('onDataReceived -> Decrypted', data);
        if (!data) {
            return;
        }
        // TODO verify data correctness.
        this.localDataController.save(data, (e) => {
            if (this.dataListener) {
                this.dataListener(data);
            } else {
                console.log('data listener not set');
            }
        });
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    toString() {
        return 'publicKey: ' + this.publicKey + ' privateKey: ' + this.privateKey;
    }
}

