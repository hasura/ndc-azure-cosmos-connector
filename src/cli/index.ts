#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import * as startCmd from "./start";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { ConnectorConfig, createConnector } from "../connector";
import { resolve } from "path";
import { getServeCommand } from "@hasura/ndc-sdk-typescript";
import { version } from "../../package.json"
import * as sdk from "@hasura/ndc-sdk-typescript";

function main() {
    const program = new Command().name("ndc-azure-cosmos").version(version);

    program.addCommand(updateCmd.cmd);

    program.addCommand(startCmd.cmd);

    program.parse(process.argv);
}

main()
