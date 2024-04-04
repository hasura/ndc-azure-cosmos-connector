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
    .addOption(
        new Option(
            "--allow-self-signed-certificate <boolean>",
            "Allow the config script to use a self-signed certificate. *NOT RECOMMENDED* to set this option for Production"
        )
            .default("false")
            .choices(["true", "false", "0", "1"])
            .preset("true")
    )
    .action((args) => {
        cliUpdateAction(resolve(args.outputDirectory), args.allowSelfSignedCertificate === 'true' || args.allowSelfSignedCertificate === '1');
    });



async function cliUpdateAction(outputDirectory: string, allowSelfSignedCertificate: boolean) {
    generateConnectorConfig(outputDirectory, allowSelfSignedCertificate)
}
