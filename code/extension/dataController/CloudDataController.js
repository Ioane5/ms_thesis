export default class CloudDataController {

    constructor(publicKey, privateKey, baseUrl) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.baseUrl = baseUrl;
    }

    sync(callback) {
        console.log('Start Sync!');
        let request = new XMLHttpRequest();
        request.open("GET", this.baseUrl + '/messages/list/' + this.publicKey, true);
        request.onreadystatechange = () => {
            if (request.readyState == 4) {
                if (request.status >= 200 && request.status < 300) {
                    let messageList = JSON.parse(request.responseText);
                    console.log('Sync: Response:', messageList);
                    messageList.forEach((messageId) => {
                        this.downloadMessage(messageId, callback);
                    });
                } else {
                    callback(null);
                }
            }
        };
        request.send();
    }

    downloadMessage(messageId, callback) {
        let request = new XMLHttpRequest();
        request.open("GET", this.baseUrl + '/messages/' + messageId, true);
        request.onreadystatechange = () => {
            if (request.readyState == 4) {
                if (request.status >= 200 && request.status < 300) {
                    try {
                        let message = JSON.parse(request.response)['message'];
                        callback(JSON.parse(message));
                    } catch (e) {
                        console.log(e, request.response);
                    }
                } else {
                    callback(null);
                }
            }
        };
        request.send();
    }

    save(data, sharedWith, callback) {
        let request = new XMLHttpRequest();
        request.open("POST", this.baseUrl + '/messages/', true);
        request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        request.onreadystatechange = function () {
            if (request.readyState == 4) {
                if (request.status >= 200 && request.status < 300) {
                    callback(true);
                } else {
                    callback(false);
                }
            }
        };
        request.send(JSON.stringify({'message': JSON.stringify(data), 'sharedWith': sharedWith}));
    }
}