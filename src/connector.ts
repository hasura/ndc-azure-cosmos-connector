import * as sdk from "@hasura/ndc-sdk-typescript";
import { Database } from "@azure/cosmos";
import path from "node:path";

export type Configuration = {
    databaseClient: Database
}

export type State = {}


export type ConnectorOptions = {
    configFilePath: string
}

export function createConnector(options: ConnectorOptions): sdk.Connector<Configuration, State> {
    const configFilePath = path.resolve(options.configFilePath);

    const connector: sdk.Connector<Configuration, State> = {
        parseConfiguration: async function(configurationDir: string): Promise<Configuration> {
            throw new Error("Not implemented");
        },

        getCapabilities(configuration: Configuration): sdk.CapabilitiesResponse {
            throw new Error("Not implemented");
        },

        tryInitState: async function(configuration: Configuration, metrics: unknown): Promise<State> {
            throw new Error("Not implemented")
        },

        getSchema: async function(configuration: Configuration): Promise<sdk.SchemaResponse> {
            throw new Error("Not implemented")
        },

        query: async function(configuration: Configuration, state: State, request: sdk.QueryRequest): Promise<sdk.QueryResponse> {
            throw new Error("Not implemented")
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
