import { CosmosClient } from "@azure/cosmos";
import { fetch_n_rows_from_container } from "./introspect_container_schema";

// TODO: accept these as arguments
const endpoint = 'https://test-cosmosdb-connector.documents.azure.com:443/';
const key = 'xrgHgDgY7dvHMmUc8m5RA5OuEkd4yEl7btorY325kKDeK360aqR1itbmHQTqiD1ZGxrv9U3DL71KACDbJbDaUg=='


async function run() {
    const client = new CosmosClient({
        endpoint, key
    });

    // TODO: accept the database id as an argument.
    const database = client.database("ConnectorTest");

    const { resources: allContainers }  =  await database.containers.readAll().fetchAll();

    allContainers.forEach(async container => {
        const dbContainer = database.container(container.id);
        const n_container_rows = await fetch_n_rows_from_container(5, dbContainer);
        console.log("container rows are ", n_container_rows);
    });

}

async function handleError(error: { code: string }): Promise<void> {
    console.log("\nAn error with code '" + error.code + "' has occurred:");
    console.log(error);

    process.exitCode = 1;
}

run().catch(handleError)
