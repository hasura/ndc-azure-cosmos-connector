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
    .action(async (args) => {
        try {
            await cliUpdateAction(resolve(args.outputDirectory));
            // This is a hack currently, because somehow after this
            // there is a call to Jaeger (not sure who is making this call).
            // Once we figure that out, we can remove the below line.
            process.exit(0);
        } catch (error) {
            console.error("An error occured while updating: ", error);
        }
    });



async function cliUpdateAction(outputDirectory: string) {
    await generateConnectorConfig(outputDirectory)
    console.log("Configuration updated successfully");
}
