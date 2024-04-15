import * as sdk from "@hasura/ndc-sdk-typescript";
import * as schema from "./schema";
import * as sql from "./sqlGeneration";
import { Database } from "@azure/cosmos";
import { runSQLQuery } from "./cosmosDb";


export enum RequestedFieldCtx {
    Select,
    Predicate,

}

export type RequestedField = {
    isSelect: boolean,
    isPredicate: boolean,
    name: string,
    fields?: RequestedFields | null
}

export type RequestedFields = {
    [fieldAlias: string]: RequestedField
}



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

/**
   * Parses a `nestedField` on a `column` and returns a `sql.sqlQueryContext`.

   * The `sql.sqlQueryContext` will be translated to a SQL subquery with the nested fields
   * requested from the `column`

   @param {sdk.NestedField} nestedField - Nested field selection.
   @param {string} parentColumn - Name of the column from where nested fields are to be selected.
   @param {string} columnPrefix - Prefix of the `column`.
   @returns {sql.SqlQueryContext} Returns the `SqlQueryContext` which will return a SQL query context which
   will contain the selection of the nested fields, which is intended to be used a subquery.

**/

function generateAliasToSelectFromParentColumn(parentColumn: sql.Column): string {
    return `_subquery_parent_${parentColumn.name}`
}


// TODO: Please write unit tests for this function.
function selectNestedField(nestedField: sdk.NestedField, parentColumn: sql.Column): sql.SqlQueryContext {
    if (nestedField.type === "object") {
        let selectFields: sql.SelectColumns = {};
        const currentAlias = generateAliasToSelectFromParentColumn(parentColumn);

        Object.entries(nestedField.fields).forEach(([fieldAlias, field]) => {
            selectFields[fieldAlias] = selectField(field, currentAlias);
        });
        const fromClause: sql.FromClause = {
            source: sql.formatColumn(parentColumn),
            sourceAlias: currentAlias,
        };
        return {
            kind: 'sqlQueryContext',
            select: selectFields,
            selectAsValue: false,
            from: fromClause,
            isAggregateQuery: false,

        }
    } else {
        throw new sdk.NotSupported("Querying nested array fields is not supported yet.")
    }
}

function selectField(field: sdk.Field, fieldPrefix: string): sql.SelectColumn {
    switch (field.type) {
        case 'column':
            const column = {
                name: field.column,
                prefix: fieldPrefix
            };
            if (field.fields !== null && field.fields !== undefined) {
                return selectNestedField(field.fields, column)
            } else {
                return {
                    kind: 'column',
                    column
                }
            }
        case 'relationship':
            throw new sdk.BadRequest("Relationships are not supported in Azure Cosmos")

    }
}

function parseQueryRequest(collectionsSchema: schema.CollectionsSchema, queryRequest: sdk.QueryRequest): sql.SqlQueryContext {
    let isAggregateQuery = false;

    let requestedSqlFields: RequestedFields = {};

    const collection: string = queryRequest.collection;

    const collectionDefinition: schema.CollectionDefinition = collectionsSchema.collections[collection];

    const rootContainerAlias = `root_${collection}`;

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
                        requestedFields[fieldName] = selectField(queryField, rootContainerAlias);
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
                                column: {
                                    name: aggregateField.column,
                                    prefix: rootContainerAlias,
                                },
                                aggregateFunction: 'DISTINCT COUNT'
                            };

                        } else {
                            requestedFields[fieldName] = {
                                kind: 'aggregate',
                                column: {
                                    name: aggregateField.column,
                                    prefix: rootContainerAlias,
                                },
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
                            column: {
                                name: aggregateField.column,
                                prefix: rootContainerAlias
                            },

                            aggregateFunction: aggregateField.function
                        }

                    }
                    break;
                case "star_count":
                    requestedFields[fieldName] = {
                        kind: 'aggregate',
                        column: {
                            name: "*",
                            prefix: rootContainerAlias,
                        },
                        aggregateFunction: 'COUNT'
                    };
                    break;
            }
        })
    }

    let fromClause: sql.FromClause = {
        source: collection,
        sourceAlias: rootContainerAlias,
    };

    let sqlGenCtx: sql.SqlQueryContext = {
        kind: 'sqlQueryContext',
        select: requestedFields,
        from: fromClause,
        isAggregateQuery,
        selectAsValue: false,

    };

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

    console.log("Requested fields are ", JSON.stringify(requestedSqlFields, null, 2));


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

    const sqlGenCtx: sql.SqlQueryContext = parseQueryRequest(collectionsSchema, queryRequest);

    const sqlQuery = sql.generateSqlQuerySpec(sqlGenCtx, collection, queryRequest.variables);

    const queryResponse = await runSQLQuery<{ [k: string]: unknown }>(sqlQuery, dbContainer);

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
