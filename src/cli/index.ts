#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { ConnectorConfig } from "../connector";
import { resolve } from "path";

export const program = new Command()
    .version("0.0.1")
    .description("Azure Cosmos Connector CLI")
    // .addCommand(initCmd.cmd) TODO: Enable when required by the CLI spec
    .addCommand(updateCmd.cmd)
    .addOption(
        new Option("--config-directory <directory>", "Configuration Directory where the config file is present.")
            .default("./")
            .env("HASURA_CONFIG_DIRECTORY")
    )
    .action((args) => {
        main(resolve(args.configDirectory));
      });

program.parse(process.argv);

async function main(configDirectory: string) {
    const configLocation = `${configDirectory}/config.json`;
    const fileContent = readFileSync(configLocation, 'utf8');
    const configObject: ConnectorConfig = JSON.parse(fileContent);

    const key = configObject.connection.key;
    const endpoint = configObject.connection.endpoint;
    const databaseName = configObject.connection.databaseName;

    execSync(`export AZURE_COSMOS_KEY=${key} && export AZURE_COSMOS_ENDPOINT=${endpoint} && export AZURE_COSMOS_DB_NAME=${databaseName} export HASURA_CONFIGURATION_DIRECTORY=\"./\"  && npm run start serve`, { stdio: "inherit" });
}
