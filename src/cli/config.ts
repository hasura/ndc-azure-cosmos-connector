import { Database } from "@azure/cosmos";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ScalarTypeDefinitions, getJSONScalarTypes } from "../schema"
import { BuiltInScalarTypeName, ObjectTypeDefinitions, TypeDefinition, ObjectTypePropertiesMap } from "../schema";

import { Container } from "@azure/cosmos"

import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { runSQLQuery, constructCosmosDbClient } from "../cosmosDb"
import { exit } from "process";
import fs from "fs";
import { promisify } from "util";
import { $RefParser } from "@apidevtools/json-schema-ref-parser";


export type RawConfiguration = {
    azure_cosmos_key: string,
    azure_cosmos_db_endpoint: string,
    azure_cosmos_db_name: string,
    azure_cosmos_no_of_rows_to_fetch: number | null
}

type JSONSchemaProperty = {
    type: string,
    $ref: string,
    items?: JSONSchemaProperty
}

type JSONSchemaDefinition = {
    type: string,
    additionalProperties: boolean,
    properties?: Record<string, JSONSchemaProperty>,
    title: string,
}

export type JSONSchema = {
    definitions: Record<string, JSONSchemaDefinition>,
    $ref: string,
}


/**
   * Fetches at-most `n` latest updated rows from the given container

   * @param n - Maximum number of rows to be fetched from the container
   * @param container - Azure Cosmos DB for NoSQL DB Container to fetch the rows from.
   * @returns The latest at-most `n` rows from the `container`.

**/
export async function fetchLatestNRowsFromContainer(n: number, container: Container): Promise<string[]> {
    const querySpec = {
        query: `SELECT * FROM ${container.id} c ORDER BY c._ts DESC OFFSET 0 LIMIT ${n}`,
        parameters: []
    }

    return await runSQLQuery<string>(querySpec, container)
}


export async function inferJSONSchemaFromContainerRows(rows: string[], containerTypeName: string): Promise<JSONSchema> {
    const jsonInput = jsonInputForTargetLanguage("schema");

    await jsonInput.addSource({
        name: containerTypeName,
        samples: rows.map(x => JSON.stringify(x))
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);

    let jsonSchema = await quicktype({
        inputData,
        lang: "schema"
    });

    let rawJSONSchemaOutput: any = jsonSchema.lines.join("\n");

    return JSON.parse(rawJSONSchemaOutput)

}

function getPropertyTypeDefn(property: JSONSchemaProperty, $refs: $RefParser): TypeDefinition | null {
    if (property.$ref !== undefined && property.$ref !== null) {

        const referencedPropertyDefn = $refs.$refs.get(property.$ref) as JSONSchemaDefinition;

        if (referencedPropertyDefn.type === "object") {
            return {
                type: "named",
                name: referencedPropertyDefn.title,
                kind: "object"
            }
        } else if (referencedPropertyDefn.type === "string") {
            return {
                type: "named",
                name: BuiltInScalarTypeName.String,
                kind: "scalar"
            }
        } else {
            console.log("Warning: Could not infer the type for referenced property", property);

        }


    } else if (property.type == "null") {
        // We don't have enough information to predict anything about the property. So, just
        // return null.
        return null
    } else if (property.type == "array") {
        if (property.items !== undefined) {
            const elementType = getPropertyTypeDefn(property.items, $refs);

            if (elementType !== null) {
                return {
                    "type": "array",
                    "elementType": elementType
                }
            }

        }
        return null
    } else if (property.type == "string") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.String,
            kind: "scalar"
        }
    } else if (property.type == "number") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    }
    else if (property.type == "integer") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    } else if (property.type == "boolean") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Boolean,
            kind: "scalar"
        }
    }

    return null
}

export async function getObjectTypeDefinitionsFromJSONSchema(containerJSONSchema: JSONSchema): Promise<ObjectTypeDefinitions> {
    var objectTypeDefinitions: ObjectTypeDefinitions = {};
    let parser = new $RefParser();

    const $refs = await parser.resolve(JSON.parse(JSON.stringify(containerJSONSchema)));
    Object.entries(containerJSONSchema.definitions).forEach(([objectTypeName, objectTypeDefinition]) => {
        if (objectTypeDefinition.type == "object") {
            var objectTypeProperties: ObjectTypePropertiesMap = {};

            if (objectTypeDefinition.properties !== undefined) {

                Object.entries(objectTypeDefinition.properties).map(([propertyName, propertyDefn]) => {

                    let propertyTypeDefn = getPropertyTypeDefn(propertyDefn, parser);

                    let legacyProperty = ['_rid', '_self', '_etag', '_attachments', '_ts']
                    if (propertyTypeDefn !== null && !legacyProperty.includes(propertyName)) {
                        objectTypeProperties[propertyName] = {
                            propertyName: propertyName,
                            description: null,
                            type: propertyTypeDefn
                        };
                    }

                })

                objectTypeDefinitions[objectTypeName] = {
                    description: null,
                    properties: objectTypeProperties
                }
            }

        }
    }
    )
    return objectTypeDefinitions
}

/**
   * Calculates the schema of the containers present in the given `database`. This function fetches
   * all the containers present in the database and fetches the latest `nRows` rows from each container
   * and infer the schema of the container using these rows.

   * @param {Database} database - Azure Cosmos DB for NoSQL Database to get the collections schema from.
   * @param {number} nRows - Number of rows to be read per container to infer the schema of the container.
   * @returns {Promise<CollectionsSchema} Schema of the collections (containers) present in the specified `database`.
*/
async function getCollectionsSchema(database: Database, nRows: number): Promise<CollectionsSchema> {

    let collectionDefinitions: CollectionDefinitions = {};

    let objectTypeDefinitions: ObjectTypeDefinitions = {};

    const scalarTypeDefinitions: ScalarTypeDefinitions = getJSONScalarTypes();

    const { resources: allContainers } = await database.containers.readAll().fetchAll();


    for (const container of allContainers) {
        const dbContainer = database.container(container.id);

        const nContainerRows = await fetchLatestNRowsFromContainer(nRows, dbContainer);
        nContainerRows.reverse();
        const containerJsonSchema = await inferJSONSchemaFromContainerRows(nContainerRows, container.id);

        const containerObjectTypeDefinitions = await getObjectTypeDefinitionsFromJSONSchema(containerJsonSchema);

        const collectionObjectType: NamedObjectTypeDefinition = {
            type: "named",
            name: containerJsonSchema.$ref.split('/').pop() as string,
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

    let schema = {
        collections: collectionDefinitions,
        objectTypes: objectTypeDefinitions,
        scalarTypes: scalarTypeDefinitions,
    };

    return schema

}

export async function generateConnectorConfig(outputConfigDir: string) {
    const rowsToFetch = process.env["AZURE_COSMOS_NO_OF_ROWS_TO_FETCH"] ?? "100";

    try {
        const client = constructCosmosDbClient();
        const schema = await getCollectionsSchema(client.dbClient, parseInt(rowsToFetch));
        const cosmosEndpoint = client.connectionDetails.endpoint;
        const cosmosDbName = client.connectionDetails.databaseName;

        const response: any = {
            connection: {
                endpoint: cosmosEndpoint,
                databaseName: cosmosDbName
            },
            schema
        };

        const writeFile = promisify(fs.writeFile);

        await writeFile(`${outputConfigDir}/config.json`, JSON.stringify(response, null, 2));


    } catch (error) {
        console.log("Error while generating the config", error);
        exit(1)
    }

}
