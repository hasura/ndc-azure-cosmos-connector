import * as sdk from "@hasura/ndc-sdk-typescript";
import { CollectionsSchema, getNdcSchemaResponse } from "./schema"
import { CosmosClient } from "@azure/cosmos";
import { throwError } from "./utils"
import { getCollectionsSchema } from "./config";
import path from "node:path";

import * as dotenv from 'dotenv';

export type Configuration = {
    collectionsSchema: CollectionsSchema
}

export type State = {
    dbClient: CosmosClient
}

export type ConnectorOptions = {
    configFilePath: string
}

export function createConnector(options: ConnectorOptions): sdk.Connector<Configuration, State> {
    const configFilePath = path.resolve(options.configFilePath);

    const connector: sdk.Connector<Configuration, State> = {
        parseConfiguration: async function(configurationDir: string): Promise<Configuration> {
            dotenv.config()

            const endpoint = process.env.DB_ENDPOINT ?? (throwError("DB_ENDPOINT env var not found"));
            const key = process.env.DB_KEY ?? throwError("DB_KEY env var not found");
            const dbName = process.env.DB_NAME ?? throwError("DB_NAME env var not found");

            const collectionsSchema = await getCollectionsSchema(endpoint, key, dbName)
            return {
                collectionsSchema: collectionsSchema
            }
        },

        getSchema: async function(configuration: Configuration): Promise<sdk.SchemaResponse> {
            return getNdcSchemaResponse(configuration.collectionsSchema)
        },


    }

    return connector;

}
