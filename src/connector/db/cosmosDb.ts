import { CosmosClient, Database, Container, SqlQuerySpec } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { throwError } from "../../utils";

export type ManagedIdentityUserIdConfig = {};

export type ManagedIdentityConfig = {
  type: "ManagedIdentity";
  // Name of the ENV var where the key can be found
  userAssignedId?: {
    fromEnvVar: string;
  };
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
      let credentials;
      if (connectionConfig.userAssignedId) {
        const managedIdentityClientId =
          getEnvVariable(connectionConfig.userAssignedId.fromEnvVar, true) ??
          throwError(
            `Azure Cosmos Managed Identity User ID not found in the env var "${connectionConfig.userAssignedId.fromEnvVar}"`,
          );

        credentials = new DefaultAzureCredential({
          managedIdentityClientId,
        });
      } else {
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
  const systemAssignedManagedIdentity = getEnvVariable(
    "AZURE_COSMOS_SYSTEM_ASSIGNED_MANAGED_IDENTITY",
  );
  const userAssignedManagedIdentity = getEnvVariable(
    "AZURE_COSMOS_USER_ASSIGNED_MANAGED_IDENTITY",
  );

  if (key) {
    return {
      type: "Key",
      fromEnvVar: "AZURE_COSMOS_KEY",
    };
  } else if (userAssignedManagedIdentity) {
    return {
      type: "ManagedIdentity",
      userAssignedId: {
        fromEnvVar: "AZURE_COSMOS_MANAGED_CLIENT_ID",
      },
    };
  } else if (systemAssignedManagedIdentity) {
    return {
      type: "ManagedIdentity",
    };
  } else {
    throw new Error(
      `Either the AZURE_COSMOS_KEY,AZURE_COSMOS_MANAGED_CLIENT_ID or AZURE_COSMOS_SYSTEM_ASSIGNED_MANAGED_IDENTITY env var is expected`,
    );
  }
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
