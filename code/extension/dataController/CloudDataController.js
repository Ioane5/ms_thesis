export default class CloudDataController {

    constructor(publicKey, privateKey, baseUrl) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.baseUrl = baseUrl;
    }

    sync(callback) {
        let request = new XMLHttpRequest();
        request.open("GET", this.baseUrl + '/messages/list/' + this.publicKey, true);
        request.onreadystatechange = () => {
            if (request.readyState == 4) {
                if (request.status >= 200 && request.status < 300) {
                    let messageList = JSON.parse(request.responseText);
                    messageList.forEach(function (messageId) {
                        this.downloadMessage(messageId, callback);
                    });
                } else {
                    callback(false);
                }
            }
        };
        request.send();
    }

    downloadMessage(messageId, callback) {
        let request = new XMLHttpRequest();
        request.open("GET", this.baseUrl + '/messages/list/' + this.publicKey, true);
        request.onreadystatechange = () => {
            if (request.readyState == 4) {
                if (request.status >= 200 && request.status < 300) {
                    let message = JSON.parse(request.responseText);
                    callback(message.message);
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
        request.send(JSON.stringify({'data': data, 'sharedWith': sharedWith}));
    }
}