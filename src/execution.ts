import * as sdk from "@hasura/ndc-sdk-typescript";
import * as schema from "./schema";
import * as sql from "./sqlGeneration";
import { Database } from "@azure/cosmos";




function validateRequest(collectionsSchema: schema.CollectionsSchema, queryRequest: sdk.QueryRequest): sql.AliasColumnMapping {
    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    let requestedFields: sql.AliasColumnMapping = {};

    if (collectionDefinition === undefined)
        throw new sdk.BadRequest(`Couldn't find collection '${collection}' in the schema.`)

    if (Object.keys(queryRequest.arguments).length != 0)
        throw new sdk.BadRequest('Collection arguments are not supported.')

    if (Object.keys(queryRequest.collection_relationships).length != 0)
        throw new sdk.BadRequest('Collection relationships are not supported.')

    const collectionObjectBaseType = schema.getBaseNamedType(collectionDefinition.resultType);

    const collectionObjectType = collectionsSchema.objectTypes[collectionObjectBaseType];

    if (collectionObjectType === undefined)
        throw new sdk.InternalServerError(`Couldn't find the schema of the object type: '${collectionObjectType}'`)

    if (queryRequest.query.fields != null) {
        Object.entries(queryRequest.query.fields).forEach(([fieldName, queryField]) => {
            switch (queryField.type) {
                case "column":
                    if (!(queryField.column in collectionObjectType.properties)) {
                        throw new sdk.BadRequest(`Couldn't find field '${queryField.column}' in object type '${collectionObjectType}'`)
                    } else {
                        requestedFields[fieldName] = queryField.column;
                    };

                    break;
                case "relationship":
                    throw new sdk.NotSupported('Querying relationship fields are not supported yet');
            }

        })
    }

    return requestedFields

}

export async function executeQuery(queryRequest: sdk.QueryRequest, collectionsSchema: schema.CollectionsSchema, dbClient: Database): Promise<sdk.QueryResponse> {
    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    if (collectionDefinition === undefined)
        throw new sdk.BadRequest(`Couldn't find collection '${collection}' in the schema.`)

    // This just assumes that the name of the collection and the container
    // will be the same, but it need not be the case? How to handle this?
    const dbContainer = dbClient.container(collection); // TODO: Check what happens when you give a container name that doesn't exist in the database.

    if (dbContainer === undefined)
        throw new sdk.InternalServerError(`Couldn't find the container '${collection}' in the schema.`)

    const requestedFields = validateRequest(collectionsSchema, queryRequest);




}
