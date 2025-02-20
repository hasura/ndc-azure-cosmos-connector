import * as sdk from "@hasura/ndc-sdk-typescript";
import * as schema from "./schema";
import * as sql from "./sql/sqlGeneration";
import { Database } from "@azure/cosmos";
import { runSQLQuery } from "./db/cosmosDb";

function validateOrderBy(
  orderBy: sdk.OrderBy,
  collectionObjectType: schema.ObjectTypeDefinition,
) {
  for (const orderByElement of orderBy.elements) {
    switch (orderByElement.target.type) {
      case "column":
        if (orderByElement.target.path.length > 0) {
          throw new sdk.NotSupported(
            "Relationships references are not supported in order by.",
          );
        }
        if (!(orderByElement.target.name in collectionObjectType.properties)) {
          throw new sdk.BadRequest(
            `Column ${orderByElement.target.name} not found in the order by clause`,
          );
        }
        break;
      case "single_column_aggregate":
        throw new sdk.NotSupported("Order by aggregate is not supported.");
      case "star_count_aggregate":
        throw new sdk.NotSupported("Order by aggregate is not supported");
    }
  }
}

function generateAliasToSelectFromParentColumn(
  parentColumn: sql.ColumnSelection,
): string {
  return `_subquery_parent_${parentColumn.name}`;
}

/**
   * Parses a `nestedField` on a `column` and returns a `sql.sqlQueryContext`.

   * The `sql.sqlQueryContext` will be translated to a SQL subquery with the nested fields
   * requested from the `column`

   @param {string} parentColumn - Name of the column from where nested fields are to be selected.
   @returns {sql.SqlQueryContext} Returns the `SqlQueryContext` which will return a SQL query context which
   will contain the selection of the nested fields, which is intended to be used a subquery.

**/
// TODO: Please write unit tests for this function.
function selectNestedField(
  nestedField: sdk.NestedField,
  parentColumn: sql.ColumnSelection,
): [sql.SqlQueryContext, string] {
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
    return [
      {
        kind: "sqlQueryContext",
        select: selectFields,
        selectAsValue: false,
        from: fromClause,
        isAggregateQuery: false,
      },
      currentAlias,
    ];
  } else {
    let [nestedFieldCtx, sourceAlias] = selectNestedField(
      nestedField.fields,
      parentColumn,
    );
    const fromClause: sql.FromClause = {
      source: sql.formatColumn(parentColumn),
      in: sourceAlias,
      sourceAlias,
    };
    nestedFieldCtx.from = fromClause;
    nestedFieldCtx.selectAsArray = true;
    return [nestedFieldCtx, sourceAlias];
  }
}

function selectField(field: sdk.Field, fieldPrefix: string): sql.SelectColumn {
  switch (field.type) {
    case "column":
      const column: sql.ColumnSelection = {
        name: field.column,
        prefix: fieldPrefix,
      };
      if (field.fields) {
        const [nestedFieldSelectCol, _] = selectNestedField(
          field.fields,
          column,
        );
        return nestedFieldSelectCol;
      } else {
        return {
          kind: "column",
          column,
        };
      }
    case "relationship":
      throw new sdk.BadRequest(
        "Relationships are not supported in Azure Cosmos DB for NoSQL",
      );
  }
}

function getRequestedFieldsFromObject(
  objectName: string,
  objectType: schema.ObjectTypeDefinition,
  fromSource: string,
  fields: { [k: string]: sdk.Field },
): sql.SelectColumns {
  var requestedFields: sql.SelectColumns = {};

  Object.entries(fields).forEach(([fieldName, queryField]) => {
    switch (queryField.type) {
      case "column":
        if (!(queryField.column in objectType.properties)) {
          throw new sdk.BadRequest(
            `Couldn't find field '${queryField.column}' in object type '${objectName}'`,
          );
        } else {
          requestedFields[fieldName] = selectField(queryField, fromSource);
        }

        break;
      case "relationship":
        throw new sdk.NotSupported(
          "Querying relationship fields are not supported.",
        );
    }
  });

  return requestedFields;
}

export function getBaseType(typeDefn: schema.TypeDefinition): string {
  switch (typeDefn.type) {
    case "array":
      return getBaseType(typeDefn.elementType);
    case "nullable":
      return getBaseType(typeDefn.underlyingType);
    case "named":
      switch (typeDefn.kind) {
        case "object":
          return typeDefn.name;
        case "scalar":
          return typeDefn.name;
      }
  }
}

function parseComparisonValue(
  rootContainerAlias: string,
  value: sdk.ComparisonValue,
  collectionObjectProperties: schema.ObjectTypePropertiesMap,
  collectionName: string,
  collectionsSchema: schema.CollectionsSchema,
): sql.ComparisonValue {
  switch (value.type) {
    case "column":
      return {
        type: "column",
        column: sql.visitComparisonTarget(
          value.column,
          collectionObjectProperties,
          collectionName,
          collectionsSchema,
        ),
      };
    case "scalar":
      return {
        type: "scalar",
        value: value.value,
      };
    case "variable":
      return {
        type: "variable",
        name: value.name,
      };
  }
}

function parseExpression(
  predicate_subquery_counter: number,
  collectionAlias: string,
  expression: sdk.Expression,
  collectionObjectProperties: schema.ObjectTypePropertiesMap,
  collectionObjectTypeName: string,
  collectionsSchema: schema.CollectionsSchema,
): sql.WhereExpression {
  switch (expression.type) {
    case "and":
      return {
        kind: "and",
        expressions: expression.expressions.map((expr) =>
          parseExpression(
            predicate_subquery_counter,
            collectionAlias,
            expr,
            collectionObjectProperties,
            collectionObjectTypeName,
            collectionsSchema,
          ),
        ),
      };
    case "or":
      return {
        kind: "or",
        expressions: expression.expressions.map((expr) =>
          parseExpression(
            predicate_subquery_counter,
            collectionAlias,
            expr,
            collectionObjectProperties,
            collectionObjectTypeName,
            collectionsSchema,
          ),
        ),
      };
    case "not":
      return {
        kind: "not",
        expression: parseExpression(
          predicate_subquery_counter,
          collectionAlias,
          expression.expression,
          collectionObjectProperties,
          collectionObjectTypeName,
          collectionsSchema,
        ),
      };
    case "unary_comparison_operator":
      switch (expression.operator) {
        case "is_null":
          return {
            kind: "simpleWhereExpression",
            column: sql.visitComparisonTarget(
              expression.column,
              collectionObjectProperties,
              collectionObjectTypeName,
              collectionsSchema,
            ),
            operator: {
              name: "is_null",
              isInfix: false,
              isUnary: true,
            },
          };
      }
    case "binary_comparison_operator":
      const comparisonTarget: sql.PredicateColumn = sql.visitComparisonTarget(
        expression.column,
        collectionObjectProperties,
        collectionObjectTypeName,
        collectionsSchema,
      );

      const comparisonTargetType = sql.getScalarType(comparisonTarget);
      const scalarDbOperator = sql.getDbComparisonOperator(
        comparisonTargetType,
        expression.operator,
      );
      return {
        kind: "simpleWhereExpression",
        column: comparisonTarget,
        value: parseComparisonValue(
          collectionAlias,
          expression.value,
          collectionObjectProperties,
          collectionObjectTypeName,
          collectionsSchema,
        ),
        operator: scalarDbOperator,
      };

    case "exists":
      switch (expression.in_collection.type) {
        case "related":
          throw new sdk.BadRequest(
            "Exists operator is not supported to query other tables",
          );
        case "unrelated":
          throw new sdk.BadRequest(
            "Exists operator is not supported to query other tables",
          );
        case "nested_collection":
          const [
            nestedCollectionPredicateColumn,
            new_predicate_subquery_counter,
          ] = sql.nestedCollectionComparisonTarget(
            predicate_subquery_counter,
            expression.in_collection.column_name,
            expression.in_collection.field_path ?? [],
            collectionsSchema,
            collectionObjectProperties,
          );

          if (expression.predicate) {
            const nestedCollectionObjectBaseType = getBaseType(
              nestedCollectionPredicateColumn.type,
            );

            const nestedCollectionObjectProperties =
              collectionsSchema.objectTypes[nestedCollectionObjectBaseType]
                .properties;

            return {
              kind: "exists",
              nestedCollectionPredicateColumn,
              expression: parseExpression(
                new_predicate_subquery_counter,
                collectionAlias,
                expression.predicate,
                nestedCollectionObjectProperties,
                nestedCollectionObjectBaseType,
                collectionsSchema,
              ),
            };
          } else {
            return {
              kind: "exists",
              nestedCollectionPredicateColumn,
            };
          }
      }
  }
}

function parseQueryRequest(
  collectionsSchema: schema.CollectionsSchema,
  queryRequest: sdk.QueryRequest,
): sql.SqlQueryContext {
  let isAggregateQuery = false;

  const collection: string = queryRequest.collection;

  const collectionDefinition: schema.CollectionDefinition =
    collectionsSchema.collections[collection];

  const rootContainerAlias = `root_${collection}`;

  let requestedFields: sql.SelectColumns = {};

  if (!collectionDefinition)
    throw new sdk.BadRequest(
      `Couldn't find collection '${collection}' in the schema.`,
    );

  if (Object.keys(queryRequest.arguments).length != 0)
    throw new sdk.BadRequest("Collection arguments are not supported.");

  if (Object.keys(queryRequest.collection_relationships).length != 0)
    throw new sdk.BadRequest("Collection relationships are not supported.");

  const collectionObjectBaseType = schema.getBaseNamedType(
    collectionDefinition.resultType,
  );

  const collectionObjectType =
    collectionsSchema.objectTypes[collectionObjectBaseType];

  if (!collectionObjectType)
    throw new sdk.InternalServerError(
      `Couldn't find the schema of the object type: '${collectionObjectBaseType}'`,
    );

  if (queryRequest.query.fields && queryRequest.query.aggregates) {
    throw new sdk.NotSupported(
      "Aggregates and fields cannot be requested together.",
    );
  }

  if (queryRequest.query.fields) {
    requestedFields = getRequestedFieldsFromObject(
      collectionObjectBaseType,
      collectionObjectType,
      rootContainerAlias,
      queryRequest.query.fields,
    );
  }

  if (queryRequest.query.aggregates) {
    isAggregateQuery = true;
    Object.entries(queryRequest.query.aggregates).forEach(
      ([fieldName, aggregateField]) => {
        switch (aggregateField.type) {
          case "column_count":
            if (!(aggregateField.column in collectionObjectType.properties)) {
              throw new sdk.BadRequest(
                `Couldn't find field '${aggregateField.column}' in object type '${collectionObjectBaseType}'`,
              );
            } else {
              if (aggregateField.distinct) {
                requestedFields[fieldName] = {
                  kind: "aggregate",
                  column: {
                    name: aggregateField.column,
                    prefix: rootContainerAlias,
                  },
                  aggregateFunction: "DISTINCT COUNT",
                };
              } else {
                requestedFields[fieldName] = {
                  kind: "aggregate",
                  column: {
                    name: aggregateField.column,
                    prefix: rootContainerAlias,
                  },
                  aggregateFunction: "COUNT",
                };
              }
            }
            break;
          case "single_column":
            if (!(aggregateField.column in collectionObjectType.properties)) {
              throw new sdk.BadRequest(
                `Couldn't find field '${aggregateField.column}' in object type '${collectionObjectType}'`,
              );
            } else {
              requestedFields[fieldName] = {
                kind: "aggregate",
                column: {
                  name: aggregateField.column,
                  prefix: rootContainerAlias,
                },

                aggregateFunction: aggregateField.function,
              };
            }
            break;
          case "star_count":
            requestedFields[fieldName] = {
              kind: "aggregate",
              column: {
                name: "*",
                prefix: rootContainerAlias,
              },
              aggregateFunction: "COUNT",
            };
            break;
        }
      },
    );
  }

  let fromClause: sql.FromClause = {
    source: collection,
    sourceAlias: rootContainerAlias,
  };

  let sqlGenCtx: sql.SqlQueryContext = {
    kind: "sqlQueryContext",
    select: requestedFields,
    from: fromClause,
    isAggregateQuery,
    selectAsValue: false,
  };

  if (queryRequest.query.limit) {
    if (queryRequest.query.offset) {
      sqlGenCtx.offset = queryRequest.query.offset;
    } else {
      // The Azure Cosmos DB for NoSQL SQL syntax always requires an
      // offset with the limit clause, so if an offset is not
      // provided, then assume the offset to be 0.
      sqlGenCtx.offset = 0;
    }
    sqlGenCtx.limit = queryRequest.query.limit;
  }

  if (queryRequest.query.order_by) {
    validateOrderBy(queryRequest.query.order_by, collectionObjectType);
    sqlGenCtx.orderBy = queryRequest.query.order_by;
  }

  if (queryRequest.query.predicate) {
    const predicate = parseExpression(
      0,
      rootContainerAlias,
      queryRequest.query.predicate,
      collectionObjectType.properties,
      collectionObjectBaseType,
      collectionsSchema,
    );

    sqlGenCtx.predicate = predicate;
  }

  return sqlGenCtx;
}

export async function executeQuery(
  queryRequest: sdk.QueryRequest,
  collectionsSchema: schema.CollectionsSchema,
  dbClient: Database,
): Promise<sdk.QueryResponse> {
  const collection: string = queryRequest.collection;

  const collectionDefinition: schema.CollectionDefinition =
    collectionsSchema.collections[collection];

  if (!collectionDefinition)
    throw new sdk.BadRequest(
      `Couldn't find collection '${collection}' in the schema.`,
    );

  const dbContainer = dbClient.container(collection);

  if (dbContainer === undefined || dbContainer == null)
    throw new sdk.InternalServerError(
      `Couldn't find the container '${collection}' in the database.`,
    );

  const sqlGenCtx: sql.SqlQueryContext = parseQueryRequest(
    collectionsSchema,
    queryRequest,
  );

  const sqlQuery = sql.constructSqlQuery(
    sqlGenCtx,
    `root_${collection}`,
    queryRequest.variables,
  );

  console.log("SQL Query: ", sqlQuery);

  const queryResponse = await runSQLQuery<{ [k: string]: unknown }>(
    sqlQuery,
    dbContainer,
  );

  let rowSet: sdk.RowSet = {};

  if (sqlGenCtx.isAggregateQuery) {
    rowSet.aggregates = queryResponse[0];
  } else {
    rowSet.rows = queryResponse;
  }

  // FIXME: When we support variables, we will need to run the query against the variables and return
  // multiple row sets.
  return [rowSet];
}
