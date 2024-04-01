import { Database } from "@azure/cosmos";
import { fetchLatestNRowsFromContainer, getObjectTypeDefinitionsFromJSONSchema, inferJSONSchemaFromContainerRows } from "./introspectContainerSchema";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ObjectTypeDefinitions, ScalarTypeDefinitions, getJSONScalarTypes } from "./schema";

/**
   * Calculates the schema of the containers present in the given `database`. This function fetches
   * all the containers present in the database and fetches the latest `nRows` rows from each container
   * and infer the schema of the container using these rows.

   * @param {Database} database - Azure cosmos Database to get the collections schema from.
   * @param {number} nRows - Number of rows to be read per container to infer the schema of the container.
   * @returns {Promise<CollectionsSchema} Schema of the collections (containers) present in the specified `database`.
*/
export async function getCollectionsSchema(database: Database, nRows: number): Promise<CollectionsSchema> {

    let collectionDefinitions: CollectionDefinitions = {};

    let objectTypeDefinitions: ObjectTypeDefinitions = {};

    const scalarTypeDefinitions: ScalarTypeDefinitions = getJSONScalarTypes();

    const { resources: allContainers } = await database.containers.readAll().fetchAll();

    for (const container of allContainers) {
        const dbContainer = database.container(container.id);

        const nContainerRows = await fetchLatestNRowsFromContainer(nRows, dbContainer);
        nContainerRows.reverse();
        const [containerTypeName, containerJsonSchema] = await inferJSONSchemaFromContainerRows(nContainerRows, container.id);

        const containerObjectTypeDefinitions = getObjectTypeDefinitionsFromJSONSchema(containerJsonSchema);

        const collectionObjectType: NamedObjectTypeDefinition = {
            type: "named",
            name: containerTypeName,
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
