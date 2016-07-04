
class Schema {

    static createTable(schema) {
        let table = [`CREATE TABLE IF NOT EXISTS ${schema.table} (`];
        let columns = [];
        Object.keys(schema.columns).forEach((name) => {
            let value = schema.columns[name];
            let type = value.type.toUpperCase();
            if (type == 'SERIAL') {
                type = 'INTEGER PRIMARY KEY AUTOINCREMENT';
            }
            columns.push(`${name} ${type}`);
        });
        table.push(columns.join(",\n"));
        table.push(")");
        // let result = [`DROP TABLE IF EXISTS ${schema.table}`];
        let result = [];
        result.push(table.join("\n"));
        return result;
    }

    static createIndex(schema) {
        // TODO: process schema.indexes
        let result = [];
        Object.keys(schema.columns).forEach((name) => {
            let value = schema.columns[name];
            if (value.index) {
               let idxName = `${schema.table}_${name}`;
               result.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${schema.table} (${name})`);
            }
        });
        return result;
    }

}

export default Schema;