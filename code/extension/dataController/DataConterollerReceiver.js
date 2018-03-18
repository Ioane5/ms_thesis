import P2PController from './p2pcontroller.js'

/**
 * This class should be initialized in Extension.
 * It will hold P2P controller and wait for actions from front side.
 */
export default class DataControllerReceiver {
    constructor() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            let params = message["params"];
            switch (message["action"]) {
                case "isInitialized":
                    this.isInitialized(sendResponse);
                    break;
                case "init" :
                    this.init(params, sendResponse);
                    break;
                case "saveData":
                    this.saveData(params, sendResponse);
                    break;
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
        this.dataController = new P2PController(params.publicKey, params.privateKey, 'http://localhost:8080');
        this.dataController.listenDataChanges((message) => {
            chrome.runtime.sendMessage({
                "action": "listenDataChanges",
                "message": message
            })
        });
        callback();
    }

    saveData(params, callback) {
        this.dataController.saveData(params.data, params.sharedWith);
    }
}