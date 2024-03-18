import * as sdk from "@hasura/ndc-sdk-typescript";
import * as schema from "./schema";
import * as sql from "./sqlGeneration";
import { Database } from "@azure/cosmos";
import { runSQLQuery } from "./cosmosDb";


function validateOrderBy(orderBy: sdk.OrderBy, collectionObjectType: schema.ObjectTypeDefinition) {

    for (const orderByElement of orderBy.elements) {
        switch (orderByElement.target.type) {
            case 'column':
                if (orderByElement.target.path.length > 0) {
                    throw new sdk.NotSupported("Relationships references are not supported in order by.")
                };
                if (!(orderByElement.target.name in collectionObjectType.properties)) {
                    throw new sdk.BadRequest(`Column ${orderByElement.target.name} not found in the order by clause`)
                };
                break;
            case 'single_column_aggregate':
                throw new sdk.NotSupported('Order by aggregate is not supported.')
            case 'star_count_aggregate':
                throw new sdk.NotSupported('Order by aggregate is not supported')
        }
    }
}


function parseQueryRequest(collectionsSchema: schema.CollectionsSchema, queryRequest: sdk.QueryRequest): sql.SqlQueryGenerationContext {
    let isAggregateQuery = false;

    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    let requestedFields: sql.SelectColumns = {};

    if (collectionDefinition === undefined)
        throw new sdk.BadRequest(`Couldn't find collection '${collection}' in the schema.`)

    if (Object.keys(queryRequest.arguments).length != 0)
        throw new sdk.BadRequest('Collection arguments are not supported.')

    if (Object.keys(queryRequest.collection_relationships).length != 0)
        throw new sdk.BadRequest('Collection relationships are not supported.')

    const collectionObjectBaseType = schema.getBaseNamedType(collectionDefinition.resultType);

    const collectionObjectType = collectionsSchema.objectTypes[collectionObjectBaseType];

    if (collectionObjectType === undefined)
        throw new sdk.InternalServerError(`Couldn't find the schema of the object type: '${collectionObjectBaseType}'`)

    if (queryRequest.query.fields != null && queryRequest.query.aggregates != null) {
        throw new sdk.NotSupported("Aggregates and fields cannot be requested together.")
    }

    if (queryRequest.query.fields != null) {
        Object.entries(queryRequest.query.fields).forEach(([fieldName, queryField]) => {
            switch (queryField.type) {
                case "column":
                    if (!(queryField.column in collectionObjectType.properties)) {
                        throw new sdk.BadRequest(`Couldn't find field '${queryField.column}' in object type '${collectionObjectBaseType}'`)
                    } else {
                        requestedFields[fieldName] = {
                            kind: 'column',
                            columnName: queryField.column
                        }
                    };

                    break;
                case "relationship":
                    throw new sdk.NotSupported('Querying relationship fields are not supported.');
            }

        })
    }

    if (queryRequest.query.aggregates != null) {
        isAggregateQuery = true;
        Object.entries(queryRequest.query.aggregates).forEach(([fieldName, aggregateField]) => {
            switch (aggregateField.type) {
                case "column_count":
                    if (!(aggregateField.column in collectionObjectType.properties)) {
                        throw new sdk.BadRequest(`Couldn't find field '${aggregateField.column}' in object type '${collectionObjectBaseType}'`);
                    } else {
                        if (aggregateField.distinct) {
                            requestedFields[fieldName] = {
                                kind: 'aggregate',
                                columnName: aggregateField.column,
                                aggregateFunction: 'DISTINCT COUNT'
                            };

                        } else {
                            requestedFields[fieldName] = {
                                kind: 'aggregate',
                                columnName: aggregateField.column,
                                aggregateFunction: 'COUNT'
                            }
                        }

                    }
                    break;
                case "single_column":
                    if (!(aggregateField.column in collectionObjectType.properties)) {
                        throw new sdk.BadRequest(`Couldn't find field '${aggregateField.column}' in object type '${collectionObjectType}'`);
                    } else {
                        requestedFields[fieldName] = {
                            kind: 'aggregate',
                            columnName: aggregateField.column,
                            aggregateFunction: aggregateField.function
                        }

                    }
                    break;
                case "star_count":
                    requestedFields[fieldName] = {
                        kind: 'aggregate',
                        columnName: '*',
                        aggregateFunction: 'COUNT'
                    };
                    break;
            }
        })
    }

    let sqlGenCtx: sql.SqlQueryGenerationContext = {
        selectFields: requestedFields,
        isAggregateQuery
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


    if (queryRequest.query.order_by != null && queryRequest.query.order_by != undefined) {
        validateOrderBy(queryRequest.query.order_by, collectionObjectType);
        sqlGenCtx.orderBy = queryRequest.query.order_by;
    }
    sqlGenCtx.predicate = queryRequest.query.predicate;

    return sqlGenCtx

}

export async function executeQuery(queryRequest: sdk.QueryRequest, collectionsSchema: schema.CollectionsSchema, dbClient: Database): Promise<sdk.QueryResponse> {
    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    if (collectionDefinition === undefined)
        throw new sdk.BadRequest(`Couldn't find collection '${collection}' in the schema.`)


    const dbContainer = dbClient.container(collection);

    if (dbContainer === undefined || dbContainer == null)
        throw new sdk.InternalServerError(`Couldn't find the container '${collection}' in the schema.`)

    const sqlGenCtx: sql.SqlQueryGenerationContext = parseQueryRequest(collectionsSchema, queryRequest);

    var queryResponse: { [k: string]: unknown; }[] = [];
    // if there are no fields to select, then return an empty response.
    if (sqlGenCtx.selectFields == null || sqlGenCtx.selectFields == undefined || Object.keys(sqlGenCtx.selectFields).length === 0) {
        queryResponse = [];
    }
    else {
        const sqlQuery = sql.generateSqlQuery(sqlGenCtx, collection, collection[0]);

        const sqlQueryResponse = await runSQLQuery<{ [k: string]: unknown }>(sqlQuery, dbContainer);
        queryResponse = sqlQueryResponse;
    }

    let rowSet: sdk.RowSet = {};

    if (sqlGenCtx.isAggregateQuery) {
        rowSet.aggregates = queryResponse[0]
    } else {
        rowSet.rows = queryResponse
    }

    // FIXME: When we support variables, we will need to run the query against the variables and return
    // multiple row sets.
    return [rowSet]
}
