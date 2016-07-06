import DB from '../db/websql';
import FS from '../io/fileSystem';
import store from '../db/store';
import Table from '../db/table';

class App {
    constructor(config) {
        this.config = config;
        this.device = window.device || {};
        this.db = null;
        this.fs = null;
        Table.databaseName = config.db.name;
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    }

    onDeviceReady() {
        return Promise.all([
            this.openDB().then(() => {
                store.createSchema()
            }),
            this.prepareFS()
        ]);
    }

    openDB() {
        let c = this.config.db;
        DB.init();
        return  DB.openDatabase(c.name, c.version, c.description, c.size)
            .then((db) => {
                this.db = db;
            });
    }

    prepareFS() {
        return FS.init().requestPersist()
            .then((fs) => {
                this.fs = fs;
            });
    }

}

export default App;