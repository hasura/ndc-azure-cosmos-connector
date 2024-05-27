#! /usr/bin/env node

import { Command, Option } from "commander";
import * as updateCmd from "./update";
import * as startCmd from "./start"
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { ConnectorConfig } from "../connector";
import { resolve } from "path";

export const program = new Command()
    .version("0.0.1")
    .description("Azure Cosmos Connector CLI")
    // .addCommand(initCmd.cmd) TODO: Enable when required by the CLI spec
    .addCommand(updateCmd.cmd)
    .addCommand(startCmd.cmd)

program.parse(process.argv);
