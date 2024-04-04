import { Command, Option } from "commander";
import { resolve } from "path";
import { generateConnectorConfig } from "./config"

export const cmd = new Command("update")
    .description(
        "Imports the containers from the specified Azure Cosmos DB and infers the schema by introspecting the containers."
    )
    .addOption(
        new Option("--output-directory <directory>", "Output Directory where the config file will be written.")
            .default("./")
            .env("HASURA_CONFIGURATION_DIRECTORY")
    )
    .action((args) => {
        cliUpdateAction(resolve(args.outputDirectory));
    });



async function cliUpdateAction(outputDirectory: string) {
    generateConnectorConfig(outputDirectory)
}
