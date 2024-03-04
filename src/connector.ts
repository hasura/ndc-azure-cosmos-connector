import * as sdk from "@hasura/ndc-sdk-typescript";
import { CollectionsSchema, getNdcSchemaResponse } from "./schema"
import { getCosmosDbClient } from "./cosmosDb";
import { Database, Container } from "@azure/cosmos";
import { getCollectionsSchema } from "./config";
import { executeQuery } from "./execution";
import { readFileSync } from "fs";

type RawConfiguration = {
    azure_cosmos_key: string,
    azure_cosmos_db_endpoint: string,
    azure_cosmos_db_name: string,
}

export type Configuration = {
    databaseClient: Database
}

export type State = {
    collectionsSchema: CollectionsSchema
}

export function createConnector(): sdk.Connector<Configuration, State> {

    const connector: sdk.Connector<Configuration, State> = {
        parseConfiguration: async function(configurationDir: string): Promise<Configuration> {

            // TODO: This is going to change, we will be reading all of this from some config file.
            try {
                const fileContent = readFileSync(configurationDir, 'utf8');
                const configObject: RawConfiguration = JSON.parse(fileContent);
                const databaseClient = getCosmosDbClient({
                    endpoint: configObject.azure_cosmos_db_endpoint,
                    key: configObject.azure_cosmos_key,
                    databaseName: configObject.azure_cosmos_db_name
                });

                return {
                    databaseClient
                }

            } catch (error) {
                console.error("Failed to parse configuration:", error);
                throw new sdk.InternalServerError(
                    "Internal Server Error, server configuration is invalid",
                    {}
                );
            }


        },

        tryInitState: async function(configuration: Configuration, metrics: unknown): Promise<State> {
            const collectionsSchema = await getCollectionsSchema(configuration.databaseClient, 5);
            return {
                collectionsSchema
            }
        },

        getSchema: async function(configuration: Configuration): Promise<sdk.SchemaResponse> {
            const collectionsSchema = await getCollectionsSchema(configuration.databaseClient, 5);
            return getNdcSchemaResponse(collectionsSchema)
        },

        getCapabilities(configuration: Configuration): sdk.CapabilitiesResponse {
            throw new Error("Not implemented");
        },

        query: async function(configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.QueryResponse> {
            return executeQuery(request, state.collectionsSchema, configuration.databaseClient)
        },

        mutation: async function(configuration: Configuration, state: State, request: sdk.MutationRequest): Promise<sdk.MutationResponse> {
            throw new Error("Not implemented")
        },

        queryExplain: function(configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.ExplainResponse> {
            throw new Error("Function not implemented.");
        },

        mutationExplain: function(configuration: Configuration, state: State, request: sdk.MutationRequest): Promise<sdk.ExplainResponse> {
            throw new Error("Function not implemented.");
        },

        healthCheck: async function(configuration: Configuration, state: State): Promise<undefined> {
            return undefined;
        },

        fetchMetrics: async function(configuration: Configuration, state: State): Promise<undefined> {
            return undefined;
        },


    }


    return connector;

}
