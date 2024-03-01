import { Database, Container } from "@azure/cosmos";
import { fetchLatestNRowsFromContainer, getObjectTypeDefinitionsFromJSONSchema, inferJSONSchemaFromContainerRows } from "./introspectContainerSchema";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ObjectTypeDefinitions, ScalarTypeDefinitions, getJSONScalarTypes, getNdcSchemaResponse } from "./schema";

export async function getCollectionsSchema(database: Database, nRows: number): Promise<CollectionsSchema> {

    let collectionDefinitions: CollectionDefinitions = {};

    let objectTypeDefinitions: ObjectTypeDefinitions = {};

    const scalarTypeDefinitions: ScalarTypeDefinitions = getJSONScalarTypes();

    const { resources: allContainers } = await database.containers.readAll().fetchAll();

    for (const container of allContainers) {
        const dbContainer = database.container(container.id);

        const nContainerRows = await fetchLatestNRowsFromContainer(nRows, dbContainer);
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
