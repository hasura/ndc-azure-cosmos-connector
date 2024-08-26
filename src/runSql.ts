// Function that accepts a SQL query and returns the result

import { Container } from "@azure/cosmos";
import { constructCosmosDbClient } from "./cosmosDb";
import { Command } from "commander";
import * as fs from "fs-extra";

// Function that accepts an arbitrary SQL query and returns the result
export async function runSQLQuery(sql: string, container: Container) {
  const sqlQuerySpec = {
    query: sql,
  };

  const result = await container.items
    .query(sqlQuerySpec)
    .fetchAll()
    .catch((err) => {
      console.error(err);
      throw err;
    });

  console.log(JSON.stringify(result.resources, null, 2));
}

async function executeSqlFromFile(filePath: string, containerName: string) {
  try {
    const sqlQuery = await fs.readFile(filePath, "utf8");

    let db = constructCosmosDbClient().dbClient;
    const container = db.container(containerName);

    await runSQLQuery(sqlQuery, container);
  } catch (err) {
    console.error("Error running SQL from file:", err);
  }
}

const program = new Command();

program
  .requiredOption(
    "--container <container>",
    "The name of the container to run the SQL in",
  )
  .requiredOption("--file <file>", "The location of the SQL file to run")
  .parse(process.argv);

const options = program.opts();

executeSqlFromFile(options.file, options.container);
