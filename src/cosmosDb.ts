import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos"
import * as https from 'https';

export type RawCosmosDbConfig = {
    databaseName: string,
    endpoint: string,
    key: string
}

/* Creates a new cosmos DB client with which the specified database can be queried. */
function getCosmosDbClient(rawDbConfig: RawCosmosDbConfig, allowSelfSignedCertificate?: boolean | undefined): Database {
    let httpsAgent: https.Agent | undefined;
    if (allowSelfSignedCertificate) {
        httpsAgent = new https.Agent({
            rejectUnauthorized: false
        })
    } else {
        httpsAgent = undefined
    };
    const dbClient = new CosmosClient({
        key: rawDbConfig.key,
        endpoint: rawDbConfig.endpoint,
        agent: httpsAgent
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

export function constructCosmosDbClient(allowSelfSignedCertificate?: boolean | undefined) {
    const key = getEnvVariable("AZURE_COSMOS_KEY");
    const endpoint = getEnvVariable("AZURE_COSMOS_ENDPOINT");
    const databaseName = getEnvVariable("AZURE_COSMOS_DB_NAME");

    const dbClient = getCosmosDbClient({
        databaseName, endpoint, key
    }, allowSelfSignedCertificate);

    return dbClient

}


/* Runs the `sqlQuerySpec` in the specified `container` */
export async function runSQLQuery<T>(sqlQuerySpec: SqlQuerySpec, container: Container): Promise<T[]> {
    return (await container.items.query(sqlQuerySpec).fetchAll()).resources
}
