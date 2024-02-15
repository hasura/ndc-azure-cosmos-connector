import { CosmosClient } from "@azure/cosmos";

// TODO: accept these as arguments
const endpoint = 'https://test-cosmosdb-connector.documents.azure.com:443/';
const key = 'xrgHgDgY7dvHMmUc8m5RA5OuEkd4yEl7btorY325kKDeK360aqR1itbmHQTqiD1ZGxrv9U3DL71KACDbJbDaUg=='


async function run() {
    const client = new CosmosClient({
        endpoint, key
    });

    console.log("aadClient created successfully");

    // TODO: accept the database id as an argument.
    const { resources: allContainers }  =  await client.database("ConnectorTest").containers.readAll().fetchAll();

    console.log("allContainers are ", allContainers);

    // const querySpec = {
    //     query: 'SELECT * FROM Volcanoes v OFFSET 0 LIMIT 10',
    //     parameters: []
    // };

    // var response = container.items.query(querySpec).fetchAll();

    // for (var item of (await response).resources) {
    //     console.log("Item is ", item);
    // }



}

async function handleError(error: { code: string }): Promise<void> {
    console.log("\nAn error with code '" + error.code + "' has occurred:");
    console.log(error);

    process.exitCode = 1;
}

run().catch(handleError)
