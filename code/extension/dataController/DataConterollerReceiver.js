import DataController from './DataController.js'

/**
 * This class should be initialized in Extension.
 * It will hold data controller and wait for actions from front side.
 */
export default class DataControllerReceiver {
    constructor() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            let params = message["params"];
            switch (message["action"]) {
                case "isInitialized":
                    return this.isInitialized(sendResponse);
                    break;
                case "init" :
                    this.init(params, sendResponse);
                    break;
                case "saveData":
                    this.saveData(params, sendResponse);
                    break;
                case "getByKey":
                    this.getByKey(params, sendResponse);
                    break;
                case "getByAuthor":
                    this.getByAuthor(params, sendResponse);
                    break;
            }
            return true;
        });
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name == 'sync_cloud') {
                this.dataController.sync();
            }
        });
    }

    isInitialized(callback) {
        if (this.dataController) {
            callback({
                "publicKey": this.dataController.publicKey,
                "privateKey": this.dataController.privateKey
            });
        } else {
            callback();
        }
    }

    init(params, callback) {
        this.dataController = new DataController(params.publicKey, params.privateKey, params.liveUrl, params.liveConfig, params.cloudUrl);
        this.dataController.listenDataChanges((message) => {
            chrome.runtime.sendMessage({
                "action": "listenDataChanges",
                "message": message
            })
        });
        callback();
    }

    saveData(params, callback) {
        this.dataController.saveData(params.data, params.sharedWith, callback);
    }

    getByKey(params, callback) {
        this.dataController.getByKey(params.key, callback);
    }

    getByAuthor(params, callback) {
        this.dataController.getByAuthor(params.author, callback);
    }
}