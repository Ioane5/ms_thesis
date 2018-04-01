import DataController from './DataController.js'

/**
 * This is client for front side. It should be initialized
 * and has the exact same interface as DataController.
 * It will interact with DataControllerReceiver in Background page.
 */
export default class DataControllerClient {

    constructor() {
        if (this.isChromeExtension()) {
            chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
                switch (message["action"]) {
                    case "listenDataChanges" :
                        if (this.listenDataChangesCallback) {
                            this.listenDataChangesCallback(message["message"]);
                        }
                        break;
                }
            });
        }
    }

    isChromeExtension() {
        return chrome.extension !== undefined
    }

    /**
     * Returns public and private keys it's initialized with.
     * undefined if not.
     */
    isInitialized(callback) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "isInitialized"
            }, callback);
        } else {
            if (this.dataController) {
                callback(this.dataController.publicKey, this.dataController.privateKey);
            } else {
                callback();
            }
        }
    }

    init(publicKey, privateKey, liveUrl, liveConfig, callback, cloudUrl, syncPeriodInMinutes) {
        chrome.alarms.clearAll(() => {
            chrome.alarms.create('sync_cloud', {'periodInMinutes': syncPeriodInMinutes});
        });
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "init",
                "params": {
                    "publicKey": publicKey,
                    "privateKey": privateKey,
                    "liveUrl": liveUrl,
                    "liveConfig": liveConfig,
                    "cloudUrl": cloudUrl
                }
            }, callback);
        } else {
            this.dataController = new DataController(publicKey, privateKey, liveUrl, liveConfig);
            callback();
        }
    }

    saveData(data, sharedWith, callback) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "saveData",
                "params": {
                    "data": data,
                    "sharedWith": sharedWith
                }
            }, callback);
        } else {
            this.dataController.saveData(data, sharedWith, callback);
        }
    }

    listenDataChanges(callback) {
        if (this.isChromeExtension()) {
            this.listenDataChangesCallback = callback;
        } else {
            this.dataController.listenDataChanges(callback);
        }
    }

    getByKey(key, callback) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "getByKey",
                "params": {
                    "key": key,
                }
            }, callback);
        } else {
            this.dataController.getByKey(key, callback);
        }
    }

    getByAuthor(author, callback) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "getByAuthor",
                "params": {
                    "author": author,
                }
            }, callback);
        } else {
            this.dataController.getByAuthor(author, callback);
        }
    }
}