#! /usr/bin/env node

import { Command } from "commander";
import * as updateCmd from "./update";

export const program = new Command()
    .version("0.0.1")
    .description("Azure Cosmos Connector CLI")
    // .addCommand(initCmd.cmd) TODO: Enable when required by the CLI spec
    .addCommand(updateCmd.cmd);

program.parse(process.argv);
