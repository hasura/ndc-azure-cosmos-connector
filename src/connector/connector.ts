import * as sdk from "@hasura/ndc-sdk-typescript";
import { CollectionsSchema, getNdcSchemaResponse } from "./schema";
import {
  AzureCosmosAuthenticationConfig,
  getCosmosDbClient,
} from "./db/cosmosDb";
import { Database } from "@azure/cosmos";
import { executeQuery } from "./execution";
import { readFileSync } from "fs";

export type Configuration = ConnectorConfig;

export type ConnectorConfig = {
  connection: {
    endpoint: string;
    authentication: AzureCosmosAuthenticationConfig;
    databaseName: string;
  };
  schema: CollectionsSchema;
};

export type State = {
  databaseClient: Database;
};

export function createConnector(): sdk.Connector<Configuration, State> {
  const connector: sdk.Connector<Configuration, State> = {
    parseConfiguration: async function (
      configurationDir: string,
    ): Promise<Configuration> {
      try {
        const configLocation = `${configurationDir}/config.json`;
        const fileContent = readFileSync(configLocation, "utf8");
        const configObject: ConnectorConfig = JSON.parse(fileContent);
        return Promise.resolve(configObject);
      } catch (error) {
        console.error("Failed to parse configuration:", error);
        throw new sdk.InternalServerError(
          "Internal Server Error, server configuration is invalid",
          {},
        );
      }
    },

    tryInitState: async function (
      config: Configuration,
      __: unknown,
    ): Promise<State> {
      try {
        const {
          databaseName,
          authentication: authenticationConfig,
          endpoint,
        } = config.connection;
        console.log(
          "Initializing the state of the connector",
          authenticationConfig,
        );
        const databaseClient = getCosmosDbClient(
          endpoint,
          databaseName,
          authenticationConfig,
        );

        return Promise.resolve({
          databaseClient,
        });
      } catch (error) {
        console.error("Failed to initialize the state of the connector", error);
        throw new sdk.InternalServerError(
          `Internal server error, failed to initialize the state of the connector - ${error}`,
          {},
        );
      }
    },

    getSchema: async function (
      configuration: Configuration,
    ): Promise<sdk.SchemaResponse> {
      if (!configuration.schema) {
        throw new sdk.Forbidden(
          "Internal server error, server configuration not found",
        );
      }
      return Promise.resolve(getNdcSchemaResponse(configuration.schema));
    },

    getCapabilities(_: Configuration): sdk.Capabilities {
      return {
        query: {
          nested_fields: {},
        },
        mutation: {},
      };
    },

    query: async function (
      configuration: Configuration,
      state: State,
      request: sdk.QueryRequest,
    ): Promise<sdk.QueryResponse> {
      return executeQuery(request, configuration.schema, state.databaseClient);
    },

    mutation: async function (
      configuration: Configuration,
      state: State,
      request: sdk.MutationRequest,
    ): Promise<sdk.MutationResponse> {
      throw new Error("Not implemented");
    },

    queryExplain: function (
      configuration: Configuration,
      state: State,
      request: sdk.QueryRequest,
    ): Promise<sdk.ExplainResponse> {
      throw new Error("Function not implemented.");
    },

    mutationExplain: function (
      configuration: Configuration,
      state: State,
      request: sdk.MutationRequest,
    ): Promise<sdk.ExplainResponse> {
      throw new Error("Function not implemented.");
    },

    fetchMetrics: async function (
      configuration: Configuration,
      state: State,
    ): Promise<undefined> {
      return undefined;
    },
  };

  return connector;
}
