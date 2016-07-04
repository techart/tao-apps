import SQL from './websql';
import squel from 'squel';
import store from './store';
import Schema from './schema';
import QueryProxy from './queryProxy';
import HTTP from '../http';
import FS from '../io/fileSystem';

class Base {

    static get databaseName() {
        return this.DBName;
    }

    static set databaseName(name) {
        return this.DBName = name;
    }

    static db() {
        return SQL.db(this.databaseName);
    }

    static get schemaSQL() {
        return Schema.createTable(this.schema).concat(Schema.createIndex(this.schema));
    }

    static get columns() {
        return Object.keys(this.schema.columns);
    }

    static get tableName()
    {
        return this.name.replace(/([A-Z])/g, ($1) => {return "_"+$1.toLowerCase();}).substr(1);
    }

    static get key() {
        return 'id';
    }

    static execute(sql, values=[]) {
        return new Promise((resolve, reject) => {
            this.db().transaction((tx) => {
                tx.executeSql(sql, values, (tx, result) => {
                    resolve(result);
                });
            }, reject, resolve);
        });
    }

    static executeList(sql = []) {
        return new Promise((resolve, reject) => {
            this.db().transaction((tx) => {
                sql.forEach((query) => {
                    if (typeof query == 'string') {
                        tx.executeSql(query);
                    } else {
                        tx.executeSql(query[0], query[1]);
                    }
                });
            }, reject, resolve);
        });
    }

    static createSchema() {
        return this.executeList(this.schemaSQL)
    }

    static make(values) {
        return new this(values);
    }

    static insert(item, mode='REPLACE') {
        let values = [];
        let ph = [];
        let columns = [];
        let attrs = item instanceof Base ? item.attrs : item;
        this.columns.forEach((c) => {
            let v = attrs[c];
            if (typeof  v != 'undefined') {
                values.push(v);
                ph.push('?');
                columns.push(c);
            }
        });
        let ph_str = ph.join(',');
        let columns_str = columns.join(',');
        return this.execute(`${mode} INTO ${this.tableName} (${columns_str}) VALUES (${ph_str})`, values);
    }

    static createQueryProxy(target, mode) {
        return new Proxy(target, new QueryProxy(this, mode));
    }

    static queryBuilder(mode='select') {
        let query = null;
        switch(mode) {
            case 'select': default:
                query =squel.select().from(this.tableName);/*.field(`${this.tableName}.*`)*/
                break;
            case 'delete':
                query = squel.delete().from(this.tableName);
                break;
            case 'update':
                query = squel.update().table(this.tableName);
                break;
            case 'insert':
                query = squel.insert().into(this.tableName);
                break;
        }
        return this.createQueryProxy(query, mode);
    }

    static find(id) {
        let {text, values} = this.queryBuilder().where(`${this.key} = ?`, id).toParam();
        return this.select(text, values).then(result => {
            let item = result[0];
            if (item) {
                return item.afterFind();
            }
            return null;
        });
    }

    constructor(values) {
        // super(...arguments);
        this._attrs = values;
    }

    get attrs() {
        return this._attrs;
    }

    get homeDir() {
        return `${this.constructor.tableName}/${this.get(this.constructor.key)}/`;
    }

    loadFiles(names) {
        var promises = Promise.resolve();
        names.forEach((name) => {
            if (this.get(name)) {
                promises.then(HTTP.download(this.get(name), this.homeDir));
            }
        });
        return promises;
    }

    getUrl(name, saveName=null, defaultValue='') {
        if (!saveName) {
            saveName = name + '_url';
        }
        if (this.get(saveName)) {
            return Promise.resolve(this.get(saveName));
        }
        let link = this.get(name);
        if (link) {
            let filename = HTTP.getFileName(link);
            return FS.toURL(this.homeDir + filename)
                .catch(() => { return defaultValue; })
                .then((url) => this.set(saveName, url));
        }
        return Promise.resolve(defaultValue);
    }

    get(name) {
        return this._attrs[name];
    }

    set(name, value) {
        this._attrs[name] = value;
    }

    preload() {
        return Promise.resolve();
    }

    afterFind() {
        return Promise.resolve(this);
    }

    getOneToMany(name, storeName, id) {
        if (this.get(name)) {
            return Promise.resolve(this.get(name));
        }
        if (this.get(id)) {
            return store.get(storeName).find(this.get(id)).then(item => this.set(name, item));
        }
        return Promise.resolve();
    }

    getManyToMany(name, storeName, id) {
        if (!this.get(name)) {
            let {text, values} = store.get(storeName).queryBuilder().where(`${id} = ?`, this.get('id')).toParam();
            return store.get(storeName).select(text, values).then(items => { this.set(name, items); return items; });
        }
        return Promise.resolve(this.get(name));
    }

    static count() {
        let qb = this.queryBuilder().field('COUNT(*) cnt');
        return this.execute(qb.toString()).then(result => {
           return result.rows.item(0).cnt;
        });
    }

    static select(query = '', binds=[]) {
        if (typeof query == 'object') {
            let param = query.toParam();
            query = param.text;
            binds = param.values;
        }
        query = query || `SELECT * FROM ${this.tableName}`;
        return new Promise((resolve) => {
            this.execute(query, binds).then(result => {
                let items = [];
                let exec = [];
                for (let i=0; i < result.rows.length; i++) {
                    let item = this.make(result.rows.item(i));
                    exec.push(item.preload());
                    items.push(item);
                }
                return Promise.all(exec).then(() => {
                    resolve(items);
                });
            });
        });
    }

}

export default Base;