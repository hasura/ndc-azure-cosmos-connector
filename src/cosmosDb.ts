import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export type RawCosmosDbConfig = {
    databaseName: string,
    endpoint: string,
    key: string
}

/* Creates a new cosmos DB client with which the specified database can be queried. */
export function getCosmosDbClient(rawDbConfig: RawCosmosDbConfig): Database {
    const dbClient = new CosmosClient({
        key: rawDbConfig.key,
        endpoint: rawDbConfig.endpoint
    });

    return dbClient.database(rawDbConfig.databaseName);

}

/* Runs the `sqlQuerySpec` in the specified `container` */
export async function runSQLQuery<T>(sqlQuerySpec: SqlQuerySpec, container: Container): Promise<T[]> {
    return (await container.items.query(sqlQuerySpec).fetchAll()).resources
}
