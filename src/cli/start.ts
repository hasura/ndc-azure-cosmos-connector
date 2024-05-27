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
        new Option("--config-directory <directory>", "Output Directory where the config file will be written.")
            .default("./")
            .env("HASURA_CONFIGURATION_DIRECTORY")
    )
    .action((args) => {
        cliRunAction(resolve(args.configDirectory));
    });



async function cliRunAction(configDirectory: string) {
    startConnector();
}