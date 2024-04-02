import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos"

export type RawCosmosDbConfig = {
    databaseName: string,
    endpoint: string,
    key: string
}

/* Creates a new cosmos DB client with which the specified database can be queried. */
function getCosmosDbClient(rawDbConfig: RawCosmosDbConfig): Database {
    const dbClient = new CosmosClient({
        key: rawDbConfig.key,
        endpoint: rawDbConfig.endpoint
    });

    return dbClient.database(rawDbConfig.databaseName);

}

function getEnvVariable(envVarName: string): string {
    const envVariable = process.env[envVarName];
    if (!envVariable) {
        throw new Error(`${envVarName} environment variable is not defined.`);
    }
    return envVariable;
}

export function constructCosmosDbClient() {
    const key = getEnvVariable("AZURE_COSMOS_KEY");
    const endpoint = getEnvVariable("AZURE_COSMOS_ENDPOINT");
    const databaseName = getEnvVariable("AZURE_COSMOS_DB_NAME");

    const dbClient = getCosmosDbClient({
        databaseName, endpoint, key
    });

    return dbClient

}


/* Runs the `sqlQuerySpec` in the specified `container` */
export async function runSQLQuery<T>(sqlQuerySpec: SqlQuerySpec, container: Container): Promise<T[]> {
    return (await container.items.query(sqlQuerySpec).fetchAll()).resources
}
