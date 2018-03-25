export default class LocalDataController {

    constructor(callback) {
        let openRequest = indexedDB.open('test_db', 2);
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
        return this.db.transaction(['data'], 'readwrite').objectStore('data');
    }

    save(data, callback) {
        let id = data['id'];
        let key = data['key'];
        if (id && key) {
            try {
                console.log('saving to db ', data);
                let objectStoreRequest = this._dataStore().add(data);
                objectStoreRequest.onsuccess = (event) => {
                    console.log('saving to db: onsuccess:', event);
                    callback(true);
                };
                objectStoreRequest.onerror = (e) => {
                    console.log('saving to db: onerror:', e);
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
        let request = index.openCursor(IDBKeyRange.only(key));
        console.log('getting from db:');
        let list = [];
        request.onsuccess = (e) => {
            let cursor = e.target.result;
            if (cursor) {
                list.push(cursor.value);
                cursor.continue();
            } else {
                callback(list);
            }
        };
        request.onerror = (e) => {
            console.log('getting from db: onerror:', e);
            callback();
        }
    }
}