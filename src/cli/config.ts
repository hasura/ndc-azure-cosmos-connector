import { Database } from "@azure/cosmos";
import { CollectionDefinition, CollectionDefinitions, CollectionsSchema, NamedObjectTypeDefinition, ScalarTypeDefinitions, getJSONScalarTypes } from "../schema"
import { BuiltInScalarTypeName, ObjectTypeDefinitions, TypeDefinition, ObjectTypePropertiesMap } from "../schema";

import { Container } from "@azure/cosmos"

import { InputData, jsonInputForTargetLanguage, quicktype } from "quicktype-core";
import { runSQLQuery, constructCosmosDbClient } from "../cosmosDb"
import { exit } from "process";
import fs from "fs";
import { promisify } from "util";

export type RawConfiguration = {
    azure_cosmos_key: string,
    azure_cosmos_db_endpoint: string,
    azure_cosmos_db_name: string,
    azure_cosmos_no_of_rows_to_fetch: number | null
}

export interface JSONDefinitionValueStringType {
    type: "string"
}

export interface JSONDefinitionValueNumberType {
    type: "number"
}

export interface JSONDefinitionValueIntegerType {
    type: "integer"
}


export interface JSONDefinitionValueBooleanType {
    type: "boolean"
}

export interface JSONDefinitionValueObjectTypeProperties {
    [propertyName: string]: JSONDefinitionValueType
}

export interface JSONDefinitionValueObjectType {
    type: "object",
    properties: JSONDefinitionValueObjectTypeProperties
}

export interface JSONDefinitionValueArrayType {
    type: "array",
    items: JSONDefinitionValueObjectTypeProperty
}

export interface JSONDefinitionValueNullType {
    type: "null"
}

export interface JSONDefinitionValueObjectTypePropertyRef {
    type?: "ref"
    '$ref': string
}

export type JSONDefinitionValueType
    = JSONDefinitionValueStringType
    | JSONDefinitionValueArrayType
    | JSONDefinitionValueBooleanType
    | JSONDefinitionValueNumberType
    | JSONDefinitionValueIntegerType
    | JSONDefinitionValueObjectType
    | JSONDefinitionValueNullType

export type JSONDefinitionValueObjectTypeProperty = JSONDefinitionValueType | JSONDefinitionValueObjectTypePropertyRef

export type JSONSchemaDefinitionValues = {
    [typeName: string]: JSONDefinitionValueType
}

export type JSONSchema = {
    definitions: JSONSchemaDefinitionValues
}


/**
   * Fetches at-most `n` latest updated rows from the given container

   * @param n - Maximum number of rows to be fetched from the container
   * @param container - Azure Cosmos DB Container to fetch the rows from.
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

    return JSON.parse(jsonSchema.lines.join(""))
}

function getPropertyTypeDefn(jsonValueTypeDefn: JSONDefinitionValueObjectTypeProperty): TypeDefinition | null {
    if (jsonValueTypeDefn.type == "ref" || jsonValueTypeDefn.type === null) {
        // Case of a reference to an object
        if (jsonValueTypeDefn['$ref'] !== null) {
            return {
                type: "named",
                name: (jsonValueTypeDefn['$ref'] as string).split('/')[2],
                kind: "object"
            }
        }

    } else if (jsonValueTypeDefn.type == "null") {
        // We don't have enough information to predict anything about the property. So, just
        // return null.
        return null
    } else if (jsonValueTypeDefn.type == "array") {
        if ('$ref' in jsonValueTypeDefn.items) {
            return {
                "type": "array",
                "elementType": {
                    "type": "named",
                    "name": (jsonValueTypeDefn.items['$ref'] as string).split('/')[2],
                    "kind": "object"
                }
            }
        } else {
            let propertyTypeDefn = getPropertyTypeDefn(jsonValueTypeDefn.items);
            if (propertyTypeDefn != null) {
                return {
                    "type": "array",
                    "elementType": propertyTypeDefn
                }
            } else {
                return null
            }
        }
    } else if (jsonValueTypeDefn.type == "string") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.String,
            kind: "scalar"
        }
    } else if (jsonValueTypeDefn.type == "number") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    }
    else if (jsonValueTypeDefn.type == "integer") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Number,
            kind: "scalar"
        }
    } else if (jsonValueTypeDefn.type == "boolean") {
        return {
            "type": "named",
            name: BuiltInScalarTypeName.Boolean,
            kind: "scalar"
        }
    }

    return null
}

export function getObjectTypeDefinitionsFromJSONSchema(containerJSONSchema: JSONSchema): ObjectTypeDefinitions {
    var objectTypeDefinitions: ObjectTypeDefinitions = {};
    Object.entries(containerJSONSchema.definitions).forEach(([objectTypeName, objectTypeDefinition]) => {
        if (objectTypeDefinition.type == "object") {
            var objectTypeProperties: ObjectTypePropertiesMap = {};

            Object.entries(objectTypeDefinition.properties).map(([propertyName, propertyDefn]) => {

                let propertyTypeDefn = getPropertyTypeDefn(propertyDefn);

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
    )
    return objectTypeDefinitions
}

/**
   * Calculates the schema of the containers present in the given `database`. This function fetches
   * all the containers present in the database and fetches the latest `nRows` rows from each container
   * and infer the schema of the container using these rows.

   * @param {Database} database - Azure cosmos Database to get the collections schema from.
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

    let schema = {
        collections: collectionDefinitions,
        objectTypes: objectTypeDefinitions,
        scalarTypes: scalarTypeDefinitions,
    };

    console.log("Scheam is ", JSON.stringify(schema, null, 2));

    return schema

}

function getEnvVariable(envVarName: string): string {
    const envVariable = process.env[envVarName];
    if (!envVariable) {
        throw new Error(`${envVarName} environment variable is not defined.`);
    }
    return envVariable;
}


export async function generateConnectorConfig(outputConfigDir: string) {
    const rowsToFetch = process.env["AZURE_COSMOS_NO_OF_ROWS_TO_FETCH"] ?? "100";

    try {
        const dbClient = constructCosmosDbClient();
        const schema = await getCollectionsSchema(dbClient, parseInt(rowsToFetch));

        console.log("schema is ", JSON.stringify(schema, null, 2));

        const response: any = {
            schema
        };

        const writeFile = promisify(fs.writeFile);

        await writeFile(`${outputConfigDir}/config.json`, JSON.stringify(response, null, 2));


    } catch (error) {
        console.log("Error while generating the config", error);
        exit(1)
    }

}
