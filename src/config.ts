import { CosmosClient } from "@azure/cosmos";
import { fetch_n_rows_from_container, infer_schema_from_container_rows } from "./introspect_container_schema";
import { CollectionDefinitions, CollectionsSchema, ObjectTypeDefinitions, ScalarTypeDefinitions, getNdcSchemaResponse } from "./schema";

// TODO: accept these as arguments
const endpoint = 'https://test-cosmosdb-connector.documents.azure.com:443/';
const key = 'xrgHgDgY7dvHMmUc8m5RA5OuEkd4yEl7btorY325kKDeK360aqR1itbmHQTqiD1ZGxrv9U3DL71KACDbJbDaUg=='


async function run() {
    const client = new CosmosClient({
        endpoint, key
    });

    // TODO: accept the database id as an argument.
    const database = client.database("ConnectorTest");

    const { resources: allContainers } = await database.containers.readAll().fetchAll();

    var collectionDefinitions: CollectionDefinitions = {};

    var objectTypeDefinitions: ObjectTypeDefinitions = {};

    var scalarTypeDefinitions: ScalarTypeDefinitions = {};

    for (const container of allContainers) {
        const dbContainer = database.container(container.id);
        const n_container_rows = await fetch_n_rows_from_container(5, dbContainer);
        const [collectionDefinition, containerObjTypeDefinitions] = infer_schema_from_container_rows(n_container_rows, container.id);
        collectionDefinitions[container.id] = collectionDefinition;
        objectTypeDefinitions = { ...objectTypeDefinitions, ...containerObjTypeDefinitions };
    }

    const collectionsSchema: CollectionsSchema = {
        collections: collectionDefinitions,
        objectTypes: objectTypeDefinitions,
        scalarTypes: scalarTypeDefinitions,
    };

    console.log("Schema response is ", JSON.stringify(getNdcSchemaResponse(collectionsSchema), null, 2));
}

async function handleError(error: { code: string }): Promise<void> {
    console.log("\nAn error with code '" + error.code + "' has occurred:");
    console.log(error);

    process.exitCode = 1;
}

run().catch(handleError)
