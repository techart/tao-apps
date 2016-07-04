import $ from 'jquery';
import pubsub from '../pubsub';


class ImportXML {

    constructor(url) {
        this.url = url;
        this.progress = 0;
    }

    reduce(array) {
        return array.reduce((p, fn) => p.then(fn), Promise.resolve());
    }

    run() {
        this.progress = 0;
        return new Promise((resolve, reject) => {
            $.get(this.url, (data) => {
                let $xml = $(data);
                let funcs = this.importXML($xml);
                this.reduce(funcs).then(resolve);
            }).fail(reject);
        });
    }

    updateProgress(value) {
        this.progress += value;
        pubsub.emit('import-progress', this.progress);
    }

    /*eslint no-unused-vars: ["error", { "args": "none" }]*/
    importXML($xml) {
        var funcs = [];
        // this.importNode();
        return funcs;
    }

    importNode($xml, selector, callback, funcs) {
        let $items = $xml.find(selector);
        let len = $items.length;
        $items.each((i, item) => {
            let execList = callback($(item), i, len);
            funcs.push(this.reduce(execList));
        });
    }
}

export default ImportXML;