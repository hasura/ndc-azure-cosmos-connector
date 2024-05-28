#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { ConnectorConfig, createConnector } from "../connector";
import { resolve } from "path";
import { getServeCommand } from "@hasura/ndc-sdk-typescript";

function main() {
    const program = getServeCommand();

    program.version("0.0.1")
        .description("Azure Cosmos Connector CLI")
        .addCommand(updateCmd.cmd);

    program.addCommand(getServeCommand(createConnector()));
    program.parse(process.argv);
}

main()
