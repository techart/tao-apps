
class QueryProxy {
    constructor(table, mode='select') {
        this.table = table;
        this.mode = mode;
        this.target = null;
    }

    get(target, name) {
        if (name in target) {
            return target[name];
        }
        return this.map.bind(this, target, name);
        // return this.map(target, name, args);
    }

    map(target, name) {
        let args = Array.prototype.slice.call(arguments, 2);
        if (name in this) {
            this.target = target;
            return this[name].apply(this, args);
        } else {
            throw new Error(`method ${name} not found in queryBuilder`);
        }
    }

    find(params) {
        let filters = Object.getOwnPropertyNames(this.__proto__).filter((p) => {
            return typeof this[p] === 'function' && p.startsWith('findBy');
        });
        filters.forEach((method) => {
            this[method].call(this, params);
        });
        return this;
    }

    empty() {
        this.target.where('1 = 0');
        return this;
    }
}

export default QueryProxy;