import * as sdk from "@hasura/ndc-sdk-typescript";
import { CollectionsSchema, getNdcSchemaResponse } from "./schema"
import { getCosmosDbClient } from "./cosmosDb";
import { Database } from "@azure/cosmos";
import { getCollectionsSchema } from "./config";
import { executeQuery } from "./execution";
import { readFileSync } from "fs";


type RawConfiguration = {
    azure_cosmos_key: string,
    azure_cosmos_db_endpoint: string,
    azure_cosmos_db_name: string,
    azure_cosmos_no_of_rows_to_fetch: number | null
}

export type Configuration = {
    /* Database client that will make requests to the Database */
    databaseClient: Database,
    /* Number of rows to fetch per container to infer the schema */
    rowsToFetch: number
}

export type State = {
    collectionsSchema: CollectionsSchema
}

export function createConnector(): sdk.Connector<Configuration, State> {

    const connector: sdk.Connector<Configuration, State> = {
        parseConfiguration: async function(configurationDir: string): Promise<Configuration> {

            try {
                const fileContent = readFileSync(configurationDir, 'utf8');
                const configObject: RawConfiguration = JSON.parse(fileContent);
                const databaseClient = getCosmosDbClient({
                    endpoint: configObject.azure_cosmos_db_endpoint,
                    key: configObject.azure_cosmos_key,
                    databaseName: configObject.azure_cosmos_db_name
                });
                const rowsToFetch =
                    configObject.azure_cosmos_no_of_rows_to_fetch ?? 100;


                return {
                    databaseClient, rowsToFetch
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
            try {
                const collectionsSchema = await getCollectionsSchema(configuration.databaseClient, configuration.rowsToFetch);
                return {
                    collectionsSchema
                }
            } catch (error) {
                console.error("Failed to initialize the state of the connector", error);
                throw new sdk.InternalServerError(
                    `Internal server error, failed to initialize the state of the connector - ${error}`, {}
                )
            }

        },

        getSchema: async function(configuration: Configuration): Promise<sdk.SchemaResponse> {
            try {
                const collectionsSchema = await getCollectionsSchema(configuration.databaseClient, configuration.rowsToFetch);
                return getNdcSchemaResponse(collectionsSchema)
            } catch (error) {
                console.error("Failed to get the schema ", error);
                throw new sdk.InternalServerError(
                    `Internal server error, failed to get the schema - ${error}`, {}
                )
            }

        },

        getCapabilities(configuration: Configuration): sdk.CapabilitiesResponse {
            return {
                version: "0.1.0",
                capabilities: {
                    query: {},
                    mutation: {}
                }
            }
        },

        query: async function (configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.QueryResponse> {
            console.log("Executing query:", JSON.stringify(request));
            // console.log("_attachments", request.query.fields);
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
