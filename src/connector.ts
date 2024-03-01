import * as sdk from "@hasura/ndc-sdk-typescript";
import { CollectionsSchema, getNdcSchemaResponse } from "./schema"
import { getCosmosDbClient } from "./cosmosDb";
import { Database, Container } from "@azure/cosmos";
import { throwError } from "./utils"
import { getCollectionsSchema } from "./config";
import path from "node:path";

import * as dotenv from 'dotenv';

export type Configuration = {
    databaseClient: Database
}

export type State = {
    collectionsSchema: CollectionsSchema
}

export type ConnectorOptions = {
    configFilePath: string
}

export function createConnector(options: ConnectorOptions): sdk.Connector<Configuration, State> {
    const configFilePath = path.resolve(options.configFilePath);

    const connector: sdk.Connector<Configuration, State> = {
        parseConfiguration: async function(configurationDir: string): Promise<Configuration> {
            dotenv.config()

            // TODO: This is going to change, we will be reading all of this from some config file.
            const endpoint = process.env.DB_ENDPOINT ?? (throwError("DB_ENDPOINT env var not found"));
            const key = process.env.DB_KEY ?? throwError("DB_KEY env var not found");
            const databaseName = process.env.DB_NAME ?? throwError("DB_NAME env var not found");

            const databaseClient = getCosmosDbClient({
                endpoint, key, databaseName
            });

            return {
                databaseClient
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

        query: async function(configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.QueryResponse> {

        }


    }


    return connector;

}
