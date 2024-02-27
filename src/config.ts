import { CosmosClient } from "@azure/cosmos";
import { fetch_n_rows_from_container, getObjectTypeDefinitionsFromJSONSchema, infer_schema_from_container_rows_quick_type } from "./introspect_container_schema";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ObjectTypeDefinitions, ScalarTypeDefinitions, getJSONScalarTypes, getNdcSchemaResponse } from "./schema";
import * as dotenv from 'dotenv';
import { throwError } from "./utils";
import path from "path";

dotenv.config()



async function run() {
    const endpoint = process.env.DB_ENDPOINT ?? (throwError("DB_ENDPOINT env var not found"));
    const key = process.env.DB_KEY ?? throwError("DB_KEY env var not found");
    const dbName = process.env.DB_NAME ?? throwError("DB_NAME env var not found");

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
        const n_container_rows = await fetch_n_rows_from_container(5, dbContainer);
        const containerJsonSchema = await infer_schema_from_container_rows_quick_type(n_container_rows, container.id);
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
        // objectTypeDefinitions = { ...objectTypeDefinitions, ...containerObjTypeDefinitions };
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
