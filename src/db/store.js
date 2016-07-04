
class Store {

    static init() {
        this.stories = {};
    }

    static add(name, module) {
        this.stories[name] = module;
    }

    static get(name) {
        return this.stories[name];
    }

    static createSchema() {
        let list = [];
        for (var name in this.stories) {
            list.push(this.get(name).createSchema());
        }
        return Promise.all(list);
    }

}

Store.init();

export default Store;