import { Command, Option } from "commander";
import { resolve } from "path";
import { startConnector } from "../start"
// import { generateConnectorConfig } from "./config"
import { readFileSync } from "fs";
import { ConnectorConfig } from "../connector";
import { exec, execSync } from "child_process";
import * as sdk from "@hasura/ndc-sdk-typescript";
import { createConnector } from "../connector"

export const cmd = new Command("start")
    .description(
        "Imports the containers from the specified Azure Cosmos DB and infers the schema by introspecting the containers."
    )
    .addOption(
        new Option("--configuration <directory>")
            .env("HASURA_CONFIGURATION_DIRECTORY")
            .makeOptionMandatory(true)
    )
    .addOption(
        new Option("--port <port>")
            .env("HASURA_CONNECTOR_PORT")
            .default(8080)
            .argParser(parseIntOption)
    )
    .addOption(
        new Option("--service-token-secret <secret>").env("HASURA_SERVICE_TOKEN_SECRET")
    )
    .addOption(new Option("--log-level <level>").env("HASURA_LOG_LEVEL").default("info"))
    .addOption(new Option("--pretty-print-logs").env("HASURA_PRETTY_PRINT_LOGS").default(false))
    .action(async (options: sdk.ServerOptions) => {
        const connector = createConnector();
        await sdk.startServer(connector, options)
    });

function parseIntOption(value: string, _previous: number): number {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        console.error("Not a valid integer.");
    }
    return parsedValue;
}


async function cliRunAction(configDirectory: string) {
    console.log("reaching here");
    startConnector();
}
