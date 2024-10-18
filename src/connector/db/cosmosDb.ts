import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { throwError } from "../../utils";

export type ManagedIdentityConfig = {
  type: "ManagedIdentity";
  // Name of the ENV var where the key can be found
  fromEnvVar: string;
};

export type CosmosKeyConfig = {
  type: "Key";
  // Name of the ENV var where the key can be found
  fromEnvVar: string;
};

export type AzureCosmosAuthenticationConfig =
  | CosmosKeyConfig
  | ManagedIdentityConfig;

export type RawCosmosDbConfig = {
  databaseName: string;
  endpoint: string;
  connectionConfig: AzureCosmosAuthenticationConfig;
};

/* Creates a new cosmos DB client with which the specified database can be queried. */
export function getCosmosDbClient(
  endpoint: string,
  databaseName: string,
  connectionConfig: AzureCosmosAuthenticationConfig,
): Database {
  let dbClient: CosmosClient;
  switch (connectionConfig.type) {
    case "Key":
      const key =
        getEnvVariable(connectionConfig.fromEnvVar, true) ??
        throwError(
          `Azure Cosmos Key not found in the env var "${connectionConfig.fromEnvVar}"`,
        );
      dbClient = new CosmosClient({
        key,
        endpoint,
      });
      break;
    case "ManagedIdentity":
      const managedIdentityClientId = getEnvVariable(
        connectionConfig.fromEnvVar,
        false,
      );

      let credentials;
      if (managedIdentityClientId) {
        // If the managed identity client id is provided, it means
        // the user-assigned managed identity is being used.
        credentials = new DefaultAzureCredential({
          managedIdentityClientId,
        });
      } else {
        // default to system-assigned managed identity
        credentials = new DefaultAzureCredential();
      }

      dbClient = new CosmosClient({
        endpoint,
        aadCredentials: credentials,
      });
      break;
  }

  return dbClient.database(databaseName);
}

function getEnvVariable(
  envVarName: string,
  isRequired?: undefined | boolean,
): string | null {
  const envVariable = process.env[envVarName];
  if (!envVariable) {
    if (isRequired) {
      throw new Error(`${envVarName} environment variable is not defined.`);
    } else {
      return null;
    }
  }
  return envVariable;
}

function getConnectionConfig(): AzureCosmosAuthenticationConfig {
  const key = getEnvVariable("AZURE_COSMOS_KEY");
  const managed_identity_client_id = getEnvVariable(
    "AZURE_COSMOS_MANAGED_CLIENT_ID",
  );

  if (key && managed_identity_client_id) {
    throw new Error(
      `Both AZURE_COSMOS_KEY and the AZURE_COSMOS_MANAGED_CLIENT_ID cannot be set together`,
    );
  } else {
    if (key) {
      return {
        type: "Key",
        fromEnvVar: "AZURE_COSMOS_KEY",
      };
    }
  }
  return {
    type: "ManagedIdentity",
    fromEnvVar: "AZURE_COSMOS_MANAGED_CLIENT_ID",
  };
}

export async function testConnection(dbClient: Database) {
  await dbClient.read();
}

export function constructCosmosDbClient() {
  const endpoint =
    getEnvVariable("AZURE_COSMOS_ENDPOINT", true) ??
    throwError("AZURE_COSMOS_ENDPOINT not found");
  const databaseName =
    getEnvVariable("AZURE_COSMOS_DB_NAME", true) ??
    throwError("AZURE_COSMOS_DB_NAME not found");
  const connectionConfig =
    getConnectionConfig() ??
    throwError("internal: could not get the connection config");

  const dbClient = getCosmosDbClient(endpoint, databaseName, connectionConfig);

  const connectionDetails = {
    endpoint,
    databaseName,
    connectionConfig,
  };

  return {
    connectionDetails,
    dbClient,
  };
}

/* Runs the `sqlQuerySpec` in the specified `container` */
export async function runSQLQuery<T>(
  sqlQuerySpec: SqlQuerySpec,
  container: Container,
): Promise<T[]> {
  return (await container.items.query(sqlQuerySpec).fetchAll()).resources;
}
