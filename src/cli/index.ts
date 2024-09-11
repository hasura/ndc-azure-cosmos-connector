#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import { createConnector } from "../connector";
import { version } from "../../package.json"
import * as sdk from "@hasura/ndc-sdk-typescript";


function parseIntOption(value: string, _previous: number): number {
    // parseInt takes a string and a radix
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue)) {
        console.error("Not a valid integer.");
    }
    return parsedValue;
}


function main() {
    const program = new Command().name("ndc-azure-cosmos").version(version);

    // Define the options
    program.addOption(
        new Option("--configuration <directory>")
            .env("HASURA_CONFIGURATION_DIRECTORY")
            .default(".")
    );
    program.addOption(
        new Option("--port <port>")
            .env("HASURA_CONNECTOR_PORT")
            .default(8080)
            .argParser(parseIntOption)
    );
    program.addOption(
        new Option("--host <host>")
            .env("HASURA_CONNECTOR_HOST")
            .default("::")
    );
    program.addOption(
        new Option("--service-token-secret <secret>")
            .env("HASURA_SERVICE_TOKEN_SECRET")
    );
    program.addOption(
        new Option("--log-level <level>")
            .env("HASURA_LOG_LEVEL")
            .default("info")
    );
    program.addOption(
        new Option("--pretty-print-logs")
            .env("HASURA_PRETTY_PRINT_LOGS")
            .default(false)
    );

    program.addCommand(updateCmd.cmd);

    // Define the action
    program.action(async (options: sdk.ServerOptions) => {
        const connector = createConnector();
        await sdk.startServer(connector, options);
    });



    // Parse the command line arguments
    program.parse(process.argv);
}

main();
