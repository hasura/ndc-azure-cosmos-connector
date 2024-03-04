import * as sdk from "@hasura/ndc-sdk-typescript";
import * as schema from "./schema";
import * as sql from "./sqlGeneration";
import { Database } from "@azure/cosmos";
import { runSQLQuery } from "./cosmosDb";




function validateRequest(collectionsSchema: schema.CollectionsSchema, queryRequest: sdk.QueryRequest): sql.SqlQueryGenerationContext {
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

    let sqlGenCtx: sql.SqlQueryGenerationContext = {
        fieldsToSelect: requestedFields,
    }

    if (queryRequest.query.limit != null) {
        if (queryRequest.query.offset != null) {
            sqlGenCtx.offset = queryRequest.query.offset
        } else {
            // The Azure cosmos SQL syntax always requires an
            // offset with the limit clause, so if an offset is not
            // provided, then assume the offset to be 0.
            sqlGenCtx.offset = 0
        }
        sqlGenCtx.limit = queryRequest.query.limit
    }

    sqlGenCtx.orderBy = queryRequest.query.order_by;

    return sqlGenCtx

}

export async function executeQuery(queryRequest: sdk.QueryRequest, collectionsSchema: schema.CollectionsSchema, dbClient: Database): Promise<sdk.QueryResponse> {
    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    if (collectionDefinition === undefined)
        throw new sdk.BadRequest(`Couldn't find collection '${collection}' in the schema.`)

    // This just assumes that the name of the collection and the container
    // will be the same, but it need not be the case? How to handle this?
    const dbContainer = dbClient.container(collection); // TODO: Check what happens when you give a container name that doesn't exist in the database.

    if (dbContainer === undefined || dbContainer == null)
        throw new sdk.InternalServerError(`Couldn't find the container '${collection}' in the schema.`)

    const sqlGenCtx = validateRequest(collectionsSchema, queryRequest);

    const sqlQuery = sql.generateSqlQuery(sqlGenCtx, collection, collection[0]);

    const queryResponse = await runSQLQuery<{ [k: string]: sdk.RowFieldValue }>(sqlQuery, dbContainer);

    const rowSet: sdk.RowSet = {
        rows: queryResponse
    }

    // FIXME: When we support variables, we will need to run the query against the variables and return
    // multiple row sets.
    return [rowSet]
}
