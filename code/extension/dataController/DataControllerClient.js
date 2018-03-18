import P2PController from './p2pcontroller.js'

/**
 * This is client for front side. It should be initialized
 * and has the exact same interface as P2PController.
 * It will interact with P2PControllerReceiver in Background page.
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

    init(publicKey, privateKey, liveUrl, liveConfig, callback) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "init",
                "params": {
                    "publicKey": publicKey,
                    "privateKey": privateKey,
                    "liveUrl": liveUrl,
                    "liveConfig": liveConfig
                }
            }, callback);
        } else {
            this.dataController = new P2PController(publicKey, privateKey, liveUrl, liveConfig);
            callback();
        }
    }

    saveData(data, sharedWith) {
        if (this.isChromeExtension()) {
            chrome.runtime.sendMessage({
                "action": "saveData",
                "params": {
                    "data": data,
                    "sharedWith": sharedWith
                }
            });
        } else {
            this.dataController.saveData(data, sharedWith);
        }
    }

    listenDataChanges(callback) {
        if (this.isChromeExtension()) {
            this.listenDataChangesCallback = callback;
        } else {
            this.dataController.listenDataChanges(callback);
        }
    }
}