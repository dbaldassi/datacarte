
import { DuckDBResultReader, DuckDBInstanceCache, Json } from '@duckdb/node-api';
import { DuckColumnInfo, DuckTableInfo} from './type.ts';

const DB: string = "./consommation_entreprise.db";

export class DuckDBManager {

    private cache : DuckDBInstanceCache;

    constructor() {
        this.cache = new DuckDBInstanceCache();
    }

    async execute(query:string, database: string = DB, args: any[] | undefined = undefined) : Promise<DuckDBResultReader>{
        const instance = await this.cache.getOrCreateInstance(database);
        const connection = await instance.connect();

        const reader = await connection.runAndReadAll(query, args);

        connection.disconnectSync();

        return reader;
    }

    async get_columns_from_query(query:string, database: string = DB) : Promise<string[]> {
        const exec_query =  `SELECT * FROM (${query}) AS subquery LIMIT 0`;
        const reader = await this.execute(exec_query, database);
        return reader.columnNames();
    }

    async get_table_columns(table:string, nameonly: boolean = true, database: string = DB) : Promise<Json[]|Json[][]> {
        const reader = await this.execute(`DESCRIBE ${table}`, database);


        if(nameonly) return reader.getColumnsJson()[0];

        return reader.getRowsJson();
    }

    async get_tables(database: string=DB) : Promise<DuckTableInfo[]> {
        const reader = await this.execute("SHOW TABLES", database);
        const tables = reader.getRowsJson();

        const info : DuckTableInfo[] = [];

        for(const table of tables) {
            const table_name: string = table[0] as string;
            const columns = await this.get_table_columns(table_name, false, database) as Json[][];

            const column_info: DuckColumnInfo[] = [];

            for (const col of columns) {
                column_info.push({name : col[0] as string, type: col[1] as string});
            }

            info.push({
                name: table_name,
                columns: column_info,
            });
        }

        return info;
    }

    async table_exists(table: string, database: string = DB): Promise<boolean> {
        const tables_result = await this.execute("SHOW TABLES", database);
        const table_exists = tables_result.getRowsJson().some((row: Json[]) => row[0] === table);
        return table_exists;
    }

    async count_rows(table: string, database: string): Promise<number> {
        const count_query = `SELECT COUNT(*) FROM ${table}`;
        const row_count_result = await this.execute(count_query, database);
        const row_count = row_count_result.getRowsJson()[0][0] as number;

        return row_count;
    }
}
