import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos"
import { DefaultAzureCredential, ManagedIdentityCredential } from "@azure/identity"
import { throwError } from "./utils"


export type ManagedIdentityConfig = {
    type: 'ManagedIdentity',
    clientId: string
}

export type CosmosKeyConfig = {
    type: 'Key',
    key: string
}

export type ConnectionConfig = CosmosKeyConfig | ManagedIdentityConfig

export type RawCosmosDbConfig = {
    databaseName: string,
    endpoint: string,
    connectionConfig: ConnectionConfig
}


/* Creates a new cosmos DB client with which the specified database can be queried. */
function getCosmosDbClient(endpoint: string, databaseName: string, connectionConfig: ConnectionConfig): Database {
    let dbClient: CosmosClient;
    switch (connectionConfig.type) {
        case "Key":
            dbClient = new CosmosClient({
                key: connectionConfig.key,
                endpoint
            });
            break;
        case "ManagedIdentity":
            let credentials = new DefaultAzureCredential(
                {
                    managedIdentityClientId: connectionConfig.clientId
                }
            );
            dbClient = new CosmosClient(
                {
                    endpoint,
                    aadCredentials: credentials
                }
            );
            break;
    };

    return dbClient.database(databaseName);

}

function getEnvVariable(envVarName: string, isRequired?: undefined | boolean): string | null {
    const envVariable = process.env[envVarName];
    if (!envVariable) {
        if (isRequired) {
            throw new Error(`${envVarName} environment variable is not defined.`);
        } else {
            return null
        }

    }
    return envVariable;
}


function getConnectionConfig(): ConnectionConfig | null {
    const key = getEnvVariable("AZURE_COSMOS_KEY");
    const managed_identity_client_id = getEnvVariable("AZURE_COSMOS_MANAGED_CLIENT_ID");

    if (key === null && managed_identity_client_id === null) {
        throw new Error(`Either the AZURE_COSMOS_KEY or the AZURE_COSMOS_MANAGED_CLIENT_ID env var is expected`)
    } else if (key && managed_identity_client_id) {
        throw new Error(`Both AZURE_COSMOS_KEY and the AZURE_COSMOS_MANAGED_CLIENT_ID cannot be set`)
    } else {
        if (key) {
            return {
                type: 'Key',
                key
            }
        } else if (managed_identity_client_id) {
            return {
                type: 'ManagedIdentity',
                clientId: managed_identity_client_id
            }
        }
    }
    return null
}

export function constructCosmosDbClient() {

    const endpoint = getEnvVariable("AZURE_COSMOS_ENDPOINT", true) ?? throwError("AZURE_COSMOS_ENDPOINT not found");
    const databaseName = getEnvVariable("AZURE_COSMOS_DB_NAME", true) ?? throwError("AZURE_COSMOS_DB_NAME not found");
    const connectionConfig = getConnectionConfig() ?? throwError("internal: could not get the connection config");

    const dbClient = getCosmosDbClient(endpoint, databaseName, connectionConfig);

    const connectionDetails = {
        endpoint,
        databaseName
    }

    return {
        connectionDetails,
        dbClient
    }

}


/* Runs the `sqlQuerySpec` in the specified `container` */
export async function runSQLQuery<T>(sqlQuerySpec: SqlQuerySpec, container: Container): Promise<T[]> {
    return (await container.items.query(sqlQuerySpec).fetchAll()).resources
}
