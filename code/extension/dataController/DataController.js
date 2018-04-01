import LocalDataController from "./LocalDataController";
import LiveDataController from "./LiveDataController";
import CloudDataController from "./CloudDataController";

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
    }

    sync() {
        this.cloudDataController.sync((message) => {
            this.onDataReceived(message);
        });
    }

    getByKey(key, callback) {
        this.localDataController.getByKey(key, callback);
    }

    getByAuthor(author, callback) {
        this.localDataController.getByAuthor(key, callback);
    }

    saveData(data, sharedWith, callback) {
        data['id'] = this.uuidv4();
        data['author'] = this.publicKey;
        data['created_at'] = new Date().getTime();
        this.localDataController.save(data, callback);
        this.liveController.sendData(data, sharedWith, (success) => {
            console.log('sendData success: ' + success);
            if (!success) {
                this.cloudDataController.save(data, sharedWith, (success) => {
                    console.log('Object saved in Cloud: ' + success);
                });
            }
        });
    }

    listenDataChanges(callback) {
        this.dataListener = callback;
    }

    onDataReceived(data) {
        console.log('onDataReceived', data);
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

