#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import * as startCmd from "./start";
import { createConnector } from "../connector";
import { version } from "../../package.json"
import * as sdk from "@hasura/ndc-sdk-typescript";

function main() {
    const program = new Command().name("ndc-azure-cosmos").version(version);

    program.addCommand(updateCmd.cmd);

    program.addCommand(startCmd.cmd);

    program.parse(process.argv);
}

main()
