export default class LocalDataController {

    constructor(callback) {
        let openRequest = indexedDB.open('test_db', 1);
        openRequest.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('data')) {
                let dataStore = db.createObjectStore('data', {keyPath: 'id'});
                dataStore.createIndex('key', 'key', {unique: false});
                dataStore.createIndex('author', 'author', {unique: false});
            }
        };
        openRequest.onsuccess = (e) => {
            this.db = e.target.result;
            callback(true);
        };
        openRequest.onerror = (e) => {
            console.log('onerror!');
            console.dir(e);
            callback(false);
        };
    }

    _dataStore() {
        this.db.objectStore('data')
    }

    save(data, callback) {
        let id = data['id'];
        let key = data['key'];
        if (id && key) {
            try {
                let objectStoreRequest = this._dataStore().add(data);
                objectStoreRequest.onsuccess = (event) => {
                    callback(true);
                };
                objectStoreRequest.onerror = (e) => {
                    callback(false, e);
                }
            } catch (e) {

            }
            callback(false, 'data object already exists');
        } else {
            callback(false, 'data object is required to have id and key');
        }
    }

    getByKey(key, callback) {
        let store = this._dataStore();
        let index = store.index('key');
        this._get(index, key, callback);
    }

    getByAuthor(author, callback) {
        let store = this._dataStore();
        let index = store.index('author');
        this._get(index, key, callback);
    }

    _get(index, key, callback) {
        let request = index.get(key);
        request.onsuccess = (e) => {
            callback(e.target.result);
        };
        request.onerror = (e) => {
            callback();
        }
    }
}