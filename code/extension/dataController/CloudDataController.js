export default class CloudDataController {

    constructor(publicKey, privateKey, baseUrl) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.baseUrl = baseUrl;
    }

    sync(callback) {
        get(this.baseUrl + '/messages/list/' + this.publicKey).then((response) => {
            let messageList = JSON.parse(response);
            console.log('Sync: Response:', messageList);
            messageList.forEach((messageId) => {
                this.downloadMessage(messageId, callback);
            });
        }).catch((failedReason) => {
            console.log("failed fetch", failedReason);
            callback(null);
        });
    }

    downloadMessage(messageId, callback) {
        return this.messagePromise(messageId).then(function (message) {
            callback(message);
        }).catch(function (error) {
            callback(null);
        });
    }

    messagePromise(messageId) {
        return new Promise((resolve, reject) => {
            get(this.baseUrl + '/messages/' + messageId).then(function (response) {
                try {
                    let message = JSON.parse(response)['message'];
                    resolve(JSON.parse(message));
                } catch (e) {
                    reject(e);
                }
            }).catch((failedReason) => {
                reject(failedReason);
            });
        });
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

    publish(data, callback) {
        let request = new XMLHttpRequest();
        request.open("POST", this.baseUrl + '/public/', true);
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
        request.send(JSON.stringify({'message': JSON.stringify(data)}));
    }

    fetchPublicByKey(key, callback) {
        console.log("fetchPublicByKey", key);
        get(this.baseUrl + '/public/list/' + key).then((response) => {
            let messageList = JSON.parse(response);
            console.log('getPublicByKey: Response:', messageList);
            let arrayOfPromises = messageList.map((id) => {
                this.messagePromise(id);
            });
            Promise.all(arrayOfPromises).then((results) => {
                callback(results);
            }).catch((errors) => {
                console.log('could not download', errors);
                callback(null);
            });
        }).catch((failedReason) => {
            console.log("failed fetch", failedReason);
            callback(null);
        });
    }
}

/**
 * Function to use promises with Http Get request
 * Reference: https://developers.google.com/web/fundamentals/primers/promises#promisifying_xmlhttprequest
 */
function get(url) {
    return new Promise(function (resolve, reject) {
        let req = new XMLHttpRequest();
        req.open('GET', url);
        req.onload = function () {
            if (req.status >= 200 && req.status < 300) {
                resolve(req.response);
            } else {
                reject(Error(req.statusText));
            }
        };
        req.onerror = () => {
            reject(Error("Network Error"));
        };
        req.send();
    });
}