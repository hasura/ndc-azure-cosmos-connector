import { CosmosClient } from "@azure/cosmos";
import { fetchLatestNRowsFromContainer, getObjectTypeDefinitionsFromJSONSchema, inferJSONSchemaFromContainerRows } from "./introspect_container_schema";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ObjectTypeDefinitions, ScalarTypeDefinitions, getJSONScalarTypes, getNdcSchemaResponse } from "./schema";
import * as dotenv from 'dotenv';
import { throwError } from "./utils";

dotenv.config()


async function getCollectionsSchema(endpoint: string, key: string, dbName: string): Promise<CollectionsSchema> {
    const client = new CosmosClient({
        endpoint, key
    });


    const database = client.database(dbName);

    const { resources: allContainers } = await database.containers.readAll().fetchAll();

    var collectionDefinitions: CollectionDefinitions = {};

    var objectTypeDefinitions: ObjectTypeDefinitions = {};

    const scalarTypeDefinitions: ScalarTypeDefinitions = getJSONScalarTypes();

    for (const container of allContainers) {
        const dbContainer = database.container(container.id);
        const nContainerRows = await fetchLatestNRowsFromContainer(5, dbContainer); // FIXME: We need to get this from config.
        const containerJsonSchema = await inferJSONSchemaFromContainerRows(nContainerRows, container.id);
        const containerObjectTypeDefinitions = getObjectTypeDefinitionsFromJSONSchema(containerJsonSchema);

        const collectionObjectType: NamedObjectTypeDefinition = {
            type: "named",
            name: container.id,
            kind: "object"
        };

        const collectionDefinition: CollectionDefinition = {
            description: null,
            arguments: [],
            resultType: collectionObjectType
        };

        objectTypeDefinitions = { ...objectTypeDefinitions, ...containerObjectTypeDefinitions };
        collectionDefinitions[container.id] = collectionDefinition;
    }

    return {
        collections: collectionDefinitions,
        objectTypes: objectTypeDefinitions,
        scalarTypes: scalarTypeDefinitions,
    }

}

export async function run() {
    const endpoint = process.env.DB_ENDPOINT ?? (throwError("DB_ENDPOINT env var not found"));
    const key = process.env.DB_KEY ?? throwError("DB_KEY env var not found");
    const dbName = process.env.DB_NAME ?? throwError("DB_NAME env var not found");

    const collectionsSchema = await getCollectionsSchema(endpoint, key, dbName);

    console.log("Schema response is ", JSON.stringify(getNdcSchemaResponse(collectionsSchema), null, 2));
}
