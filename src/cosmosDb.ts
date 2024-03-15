import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos"

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export type RawCosmosDbConfig = {
    databaseName: string,
    endpoint: string,
    key: string
}

export function getCosmosClient(key: string, endpoint: string): CosmosClient {
    const cosmosClient = new CosmosClient({
        key, endpoint
    });
    return cosmosClient
}

/* Creates a new cosmos DB client with which the specified database can be queried. */
export function getCosmosDbClient(rawDbConfig: RawCosmosDbConfig): Database {
    const cosmosClient = getCosmosClient(rawDbConfig.key, rawDbConfig.endpoint);

    return cosmosClient.database(rawDbConfig.databaseName);
}

export async function runSQLQuery<T>(sqlQuerySpec: SqlQuerySpec, container: Container): Promise<T[]> {
    return (await container.items.query(sqlQuerySpec).fetchAll()).resources
}
