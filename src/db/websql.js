
let window = window || global;

class WebSQL {
    static init() {
        this.nativeOpenDatabase = window.openDatabase;
        this.sqlitePlugin = window.sqlitePlugin;
        this.device = window.device || {};
        this.dbs = {};
    }

    static db(name) {
        return this.dbs[name];
    }

    static openDatabase(dbname, _version, _description, _size) {
        if (this.device && this.device.platform != 'browser' && window.sqlitePlugin) {
            return this.cordovaPluginOpenDatabase(dbname);
        } else {
            return this.browserOpenDatabase(...arguments);
        }
    }

    static cordovaPluginOpenDatabase(dbname) {
        return new Promise((resolve, reject) => {
            this.sqlitePlugin.openDatabase({name: dbname, location: 'default'}, (db) => {
                this.dbs[dbname] = db;
                resolve(db);
            }, function(err) {
                reject(err);
            });
        });
    }

    static browserOpenDatabase(_dbname, _version, _description, _size) {
        return new Promise((resolve, reject) => {
            var db = this.nativeOpenDatabase.apply(window, arguments);
            if (db) {
                this.dbs[_dbname] = db;
                resolve(db)
            } else {
                reject(db);
            }
        });
    }


}

export default WebSQL;