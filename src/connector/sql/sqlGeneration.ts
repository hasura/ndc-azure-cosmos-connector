import * as sdk from "@hasura/ndc-sdk-typescript";
import * as cosmos from "@azure/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";
import * as schema from "../schema";
import { getBaseType } from "../execution";

export type ColumnSelection = {
  name: string;
  prefix: string;
};

export type SelectContainerColumn = {
  kind: "column";
  column: ColumnSelection;
};

export type SelectAggregate = {
  kind: "aggregate";
  column: ColumnSelection;
  aggregateFunction: string;
};

export type SelectColumn =
  | SelectContainerColumn
  | SelectAggregate
  | SqlQueryContext;

type NestedObjectField = {
  kind: "object";
  field: string;
  nestedField: NestedField;
};

type NestedScalarField = {
  field: string;
  type: string;
  kind: "scalar";
};

type NestedField = NestedObjectField | NestedScalarField;

export type NestedCollectionPredicateColumn = {
  prefix: string;
  columnName: string;
  fieldPath: string[];
  type: schema.ArrayTypeDefinition;
};

export type PredicateColumn = {
  // Name of the column
  name: string;
  // Optional path to the field
  fieldPath?: string[];
  // Type of the column, if the
  // fieldPath is provided, it will be the type of the nested field
  type: schema.NamedScalarTypeDefinition;
};

// TODO(KC): Refactor this to SimpleWhereBinaryComparisonOperatorExpression
// and create a new type to handle SimpleWhereUnaryComparisonOperatorExpression
export type SimpleWhereExpression = {
  kind: "simpleWhereExpression";
  column: PredicateColumn;
  operator: ComparisonScalarDbOperator;
  // When value is undefined, it means that the operator is unary
  value?: ComparisonValue | undefined;
};

export type AndWhereExpression = {
  kind: "and";
  expressions: WhereExpression[];
};

export type OrWhereExpression = {
  kind: "or";
  expressions: WhereExpression[];
};

export type NotWhereExpression = {
  kind: "not";
  expression: WhereExpression;
};

export type NestedCollectionWhereExpression = {
  kind: "exists";
  nestedCollectionPredicateColumn: NestedCollectionPredicateColumn;
  // Expression to filter the nested collection
  expression?: WhereExpression | null;
};

export type WhereExpression =
  | SimpleWhereExpression
  | AndWhereExpression
  | NestedCollectionWhereExpression
  | OrWhereExpression
  | NotWhereExpression;

/*
  The key represents the alias of the request field and the
  value represents the value to be selected from the container.
*/
export type SelectColumns = {
  [alias: string]: SelectColumn;
};

export type QueryVariable = {
  [k: string]: unknown;
};

export type QueryVariables = QueryVariable[] | null | undefined;

/*
  Type to track the parameters used in the SQL query.
 */
type SqlParameters = {
  [column: string]: any[];
};

export type FromClause = {
  source: string;
  sourceAlias: string;
  in?: string;
};

export type ContainerExpression = {
  kind: "containerExpression";
  containerExpression: string;
};

export type SqlExpression = {
  kind: "sqlExpression";
  sqlExpression: SqlQueryContext;
};

export type ArrayJoinTarget = ContainerExpression | SqlExpression;

export type ArrayJoinClause = {
  type: "array";
  joinIdentifier: string;
  arrayJoinTarget: ArrayJoinTarget;
};

export type SubqueryJoinClause = {
  type: "subquery";
  from: string;
  subQuery: SqlQueryContext;
  subQueryAs: string;
};

export type JoinClause = ArrayJoinClause | SubqueryJoinClause;

export type ComparisonScalarDbOperator = {
  name: string;
  isInfix: boolean;
  isUnary: boolean;
};

type AggregateScalarDbOperator = {
  operator: string;
  resultType: string;
};

// Defines how the NDC's scalar operators map to the DB operators
type ScalarDBOperatorMappings = {
  comparison: {
    [operatorName: string]: ComparisonScalarDbOperator;
  };
  aggregate?:
    | {
        [operatorName: string]: AggregateScalarDbOperator;
      }
    | undefined;
};

type ScalarOperatorMappings = {
  [scalarTypeName: string]: ScalarDBOperatorMappings;
};

export const scalarComparisonOperatorMappings: ScalarOperatorMappings = {
  Integer: {
    comparison: {
      is_null: {
        name: "IS_NULL",
        isInfix: false,
        isUnary: true,
      },
      eq: {
        name: "=",
        isInfix: true,
        isUnary: false,
      },
      neq: {
        name: "!=",
        isInfix: true,
        isUnary: false,
      },
      gt: {
        name: ">",
        isInfix: true,
        isUnary: false,
      },
      lt: {
        name: "<",
        isInfix: true,
        isUnary: false,
      },
      gte: {
        name: ">=",
        isInfix: true,
        isUnary: false,
      },
      lte: {
        name: "<=",
        isInfix: true,
        isUnary: false,
      },
    },
    aggregate: {
      count: {
        operator: "count",
        resultType: "Integer",
      },
      sum: {
        operator: "sum",
        resultType: "Integer",
      },
      avg: {
        operator: "sum",
        resultType: "Number",
      },
      min: {
        operator: "sum",
        resultType: "Integer",
      },
      max: {
        operator: "sum",
        resultType: "Integer",
      },
    },
  },
  Number: {
    comparison: {
      is_null: {
        name: "IS_NULL",
        isInfix: false,
        isUnary: true,
      },

      eq: {
        name: "=",
        isInfix: true,
        isUnary: false,
      },
      neq: {
        name: "!=",
        isInfix: true,
        isUnary: false,
      },
      gt: {
        name: ">",
        isInfix: true,
        isUnary: false,
      },
      lt: {
        name: "<",
        isInfix: true,
        isUnary: false,
      },
      gte: {
        name: ">=",
        isInfix: true,
        isUnary: false,
      },
      lte: {
        name: "<=",
        isInfix: true,
        isUnary: false,
      },
    },
    aggregate: {
      count: {
        operator: "count",
        resultType: "Integer",
      },
      sum: {
        operator: "sum",
        resultType: "Number",
      },
      avg: {
        operator: "sum",
        resultType: "Number",
      },
      min: {
        operator: "sum",
        resultType: "Number",
      },
      max: {
        operator: "sum",
        resultType: "Number",
      },
    },
  },
  Boolean: {
    comparison: {
      is_null: {
        name: "IS_NULL",
        isInfix: false,
        isUnary: true,
      },

      eq: {
        name: "=",
        isInfix: true,
        isUnary: false,
      },
      neq: {
        name: "!=",
        isInfix: true,
        isUnary: false,
      },
    },
    aggregate: {
      bool_and: {
        operator: "bool_and",
        resultType: "Boolean",
      },
      bool_or: {
        operator: "bool_or",
        resultType: "Boolean",
      },
      bool_not: {
        operator: "bool_or",
        resultType: "Boolean",
      },
    },
  },
  String: {
    comparison: {
      is_null: {
        name: "IS_NULL",
        isInfix: false,
        isUnary: true,
      },

      eq: {
        name: "=",
        isInfix: true,
        isUnary: false,
      },
      neq: {
        name: "!=",
        isInfix: true,
        isUnary: false,
      },
      gt: {
        name: ">",
        isInfix: true,
        isUnary: false,
      },
      lt: {
        name: "<",
        isInfix: true,
        isUnary: false,
      },
      gte: {
        name: ">=",
        isInfix: true,
        isUnary: false,
      },
      lte: {
        name: "<=",
        isInfix: true,
        isUnary: false,
      },
      contains: {
        name: "CONTAINS",
        isInfix: false,
        isUnary: false,
      },
      endswith: {
        name: "ENDSWITH",
        isInfix: false,
        isUnary: false,
      },
      regexmatch: {
        name: "REGEXMATCH",
        isInfix: false,
        isUnary: false,
      },
      startswith: {
        name: "STARTSWITH",
        isInfix: false,
        isUnary: false,
      },
    },
  },
};

// Function to get the scalar type of a column, if the column is nested, it will return the scalar type of the nested field
// Throws an error if the column is not a scalar type
export function getScalarType(
  column: PredicateColumn,
): schema.NamedScalarTypeDefinition {
  return column.type;
}

export function getDbComparisonOperator(
  scalarTypeName: schema.NamedScalarTypeDefinition,
  operator: string,
): ComparisonScalarDbOperator {
  const scalarOperators = scalarComparisonOperatorMappings[scalarTypeName.name];

  if (!scalarOperators) {
    throw new sdk.BadRequest(
      `Couldn't find scalar type: ${scalarTypeName} in the schema`,
    );
  } else {
    const scalarDbOperator = scalarOperators.comparison[operator];

    if (scalarDbOperator) {
      return scalarDbOperator;
    } else {
      throw new sdk.BadRequest(
        `Comparison Operator ${operator} is not supported on type ${scalarTypeName}`,
      );
    }
  }
}

export type ComparisonTarget =
  | {
      type: "column";
      /**
       * The name of the column
       */
      name: string;
    }
  | {
      type: "root_collection_column";
      /**
       * The name of the column
       */
      name: string;
    };

export type ComparisonValue =
  | {
      type: "column";
      column: PredicateColumn;
    }
  | {
      type: "scalar";
      value: unknown;
    }
  | {
      type: "variable";
      name: string;
    };

export type Expression =
  | {
      type: "and";
      expressions: Expression[];
    }
  | {
      type: "or";
      expressions: Expression[];
    }
  | {
      type: "not";
      expression: Expression;
    }
  | {
      type: "exists";
      expression: Expression;
      nestedCollection?: {
        columnName: string;
        field_path?: string[];
      };
    }
  | {
      type: "unary_comparison_operator";
      column: string;
      dbOperator: ComparisonScalarDbOperator;
    }
  | {
      type: "binary_comparison_operator";
      column: string;
      value: ComparisonValue;
      dbOperator: ComparisonScalarDbOperator;
    };

export type SqlQueryContext = {
  kind: "sqlQueryContext";
  select: SelectColumns;
  /* Set to `true` to prevent the wrapping of the results into another JSON object. */
  selectAsValue: boolean;
  from?: FromClause | null;
  join?: JoinClause[] | null;
  predicate?: WhereExpression | null;

  offset?: number | null;
  limit?: number | null;
  orderBy?: sdk.OrderBy | null;
  isAggregateQuery: boolean;
  selectAsArray?: boolean | undefined;
};

type VariablesMappings = {
  /*
      The variableTarget will be the name of the column
      which gets the value of the variable
     */
  [variableTarget: string]: string;
};

function formatJoinClause(joinClause: JoinClause): string {
  if (joinClause.type === "array") {
    let joinTarget =
      joinClause.arrayJoinTarget.kind === "containerExpression"
        ? joinClause.arrayJoinTarget.containerExpression
        : constructSqlQuery(
            joinClause.arrayJoinTarget.sqlExpression,
            joinClause.joinIdentifier,
            null,
          );

    return `${joinClause.joinIdentifier} in (${joinTarget})`;
  } else {
    return `(${constructSqlQuery(joinClause.subQuery, joinClause.from, null).query}) ${joinClause.subQueryAs}`;
  }
}

function formatFromClause(fromClause: FromClause): string {
  if (fromClause.in !== undefined) {
    return `${fromClause.in} IN ${fromClause.source}`;
  } else {
    return `${fromClause.source} ${fromClause.sourceAlias}`;
  }
}

/** Constructs a SQL query from the given `sqlQueryContext`
   * @param sqlQueryCtx - `SqlQueryContext` which contains the data required to generate the SQL query.
   * @param source - `source` to run the query on. Note that, the source can be a container or a nested field of a document of a container.
   * @param queryVariables - values of the variables provided with the request.

 */
export function constructSqlQuery(
  sqlQueryCtx: SqlQueryContext,
  source: string,
  queryVariables: QueryVariables,
): cosmos.SqlQuerySpec {
  let selectColumns = formatSelectColumns(sqlQueryCtx.select);

  let fromClause =
    sqlQueryCtx.from === null || sqlQueryCtx.from === undefined
      ? null
      : formatFromClause(sqlQueryCtx.from);

  let whereClause = null;
  let predicateParameters: SqlParameters = {};
  let utilisedVariables: VariablesMappings = {}; // This will be used to add the join mappings to the where expression.

  let parameters: cosmos.SqlParameter[] = [];

  if (sqlQueryCtx.predicate) {
    const whereExp = translateWhereExpression(
      source,
      // Translate the where expression to SQL
      sqlQueryCtx.predicate,
      predicateParameters,
      utilisedVariables,
    );

    whereClause = `WHERE ${whereExp}`;

    parameters = serializeSqlParameters(predicateParameters);

    if (Object.keys(utilisedVariables).length > 0) {
      if (queryVariables === null || queryVariables === undefined) {
        throw new sdk.BadRequest(
          `The variables (${JSON.stringify(Object.values(utilisedVariables))}) were referenced in the variable, but their values were not provided`,
        );
      } else {
        parameters.push({
          name: "@vars",
          value: queryVariables as cosmos.JSONValue,
        });
      }
    }
  }

  let joinClause = null;

  if (Object.keys(utilisedVariables).length > 0) {
    let variablesJoinTarget: ArrayJoinTarget = {
      kind: "containerExpression",
      containerExpression: "SELECT VALUE @vars",
    };
    let joinExp: JoinClause = {
      type: "array",
      joinIdentifier: "vars",
      arrayJoinTarget: variablesJoinTarget,
    };
    joinClause = `JOIN ${formatJoinClause(joinExp)}`;
  }

  let orderByClause = null;

  if (sqlQueryCtx.orderBy && sqlQueryCtx.orderBy.elements.length > 0) {
    orderByClause = visitOrderByElements(sqlQueryCtx.orderBy.elements, source);
  }

  let offsetClause = null;

  if (sqlQueryCtx.offset != undefined && sqlQueryCtx.offset != null) {
    offsetClause = `${sqlQueryCtx.offset}`;
  }

  let limitClause = null;

  if (sqlQueryCtx.limit != undefined && sqlQueryCtx.limit != null) {
    limitClause = `${sqlQueryCtx.limit}`;
  }

  let query = `SELECT ${sqlQueryCtx.selectAsValue ? "VALUE" : ""} ${selectColumns}
        ${fromClause ? "FROM " + fromClause : ""}
        ${joinClause ?? ""}
        ${whereClause ?? ""}
        ${orderByClause ? "ORDER BY " + orderByClause : ""}
        ${offsetClause ? "OFFSET " + offsetClause : ""}
        ${limitClause ? "LIMIT " + limitClause : ""}`;

  return {
    query,
    parameters,
  };
}

export function generateSqlQuerySpec(
  sqlGenCtx: SqlQueryContext,
  containerName: string,
  queryVariables: QueryVariables,
): SqlQuerySpec {
  return constructSqlQuery(sqlGenCtx, `root_${containerName}`, queryVariables);
}

export function formatColumn(column: ColumnSelection) {
  return `${column.prefix}.${column.name}`;
}

function formatSelectColumns(fieldsToSelect: SelectColumns): string {
  if (Object.keys(fieldsToSelect).length === 0) {
    return "VALUE {}";
  }
  return Object.entries(fieldsToSelect)
    .map(([alias, selectColumn]) => {
      switch (selectColumn.kind) {
        case "column":
          return `${formatColumn(selectColumn.column)} ?? null as ${alias}`;
        case "sqlQueryContext":
          let query = constructSqlQuery(selectColumn, alias, null).query.trim();
          if (selectColumn.selectAsArray) {
            return `(ARRAY(${query})) as ${alias}`;
          } else {
            return `(${query}) as ${alias}`;
          }
        case "aggregate":
          return `${selectColumn.aggregateFunction} (${formatColumn(selectColumn.column)}) as ${alias} `;
      }
    })
    .join(",");
}

/*
  Traverses over the order by elements and generates the ORDER BY clause.
  NOTE that this function expects the `values` parameter to be a non-empty list.
 */
function visitOrderByElements(
  values: sdk.OrderByElement[],
  containerAlias: string,
): string {
  if (values.length === 0) {
    throw new sdk.InternalServerError(
      "visit_order_by_elements called with an empty list",
    );
  }
  return values
    .map((element) => visitOrderByElement(element, containerAlias))
    .join(", ");
}

function visitOrderByElement(
  value: sdk.OrderByElement,
  containerAlias: string,
): string {
  const direction = value.order_direction === "asc" ? "ASC" : "DESC";

  switch (value.target.type) {
    case "column":
      if (value.target.path.length > 0) {
        throw new sdk.NotSupported(
          "Relationships are not supported in order_by.",
        );
      } else {
        return `${containerAlias}.${value.target.name} ${direction} `;
      }

    case "single_column_aggregate":
      throw new sdk.NotSupported("Order by aggregate is not supported");

    case "star_count_aggregate":
      throw new sdk.NotSupported("Order by aggregate is not supported");
  }
}

export function visitComparisonTarget(
  target: sdk.ComparisonTarget,
  collectionObject: schema.ObjectTypePropertiesMap,
  collectionObjectName: string,
  schema: schema.CollectionsSchema,
): PredicateColumn {
  switch (target.type) {
    case "column":
      if (target.path.length > 0) {
        throw new sdk.NotSupported(
          "Relationship fields are not supported in predicates.",
        );
      }

      let nestedObjectFieldType;

      let comparisonTargetType = collectionObject[target.name].type;

      if (target.field_path && target.field_path.length > 0) {
        const currentObjectType = getBaseType(comparisonTargetType);

        console.log("currentObjectType", currentObjectType);

        const currentObjectTypeDefinition: schema.NamedObjectTypeDefinition = {
          name: currentObjectType,
          kind: "object",
          type: "named",
        };

        nestedObjectFieldType = visitNestedObjectField(
          target.field_path,
          currentObjectTypeDefinition,
          collectionObjectName,
          schema,
        );

        return {
          name: target.name,
          fieldPath: target.field_path,
          type: nestedObjectFieldType,
        };
      } else {
        switch (comparisonTargetType.type) {
          case "named":
            switch (comparisonTargetType.kind) {
              case "object":
                throw new sdk.BadRequest(
                  `Expected field ${target.name} to be a scalar field, but it is an object`,
                );

              case "scalar":
                return {
                  name: target.name,
                  type: comparisonTargetType,
                };
            }

          case "array":
            throw new sdk.NotSupported(
              "Root collection column comparison is not supported",
            );
        }
      }

    case "root_collection_column":
      throw new sdk.NotSupported(
        "Root collection column comparison is not supported",
      );
  }
}

function visitComparisonValue(
  parameters: SqlParameters,
  variables: VariablesMappings,
  target: ComparisonValue,
  comparisonTarget: string,
  containerAlias: string,
): string {
  switch (target.type) {
    case "scalar":
      const comparisonTargetName = comparisonTarget.replaceAll(".", "_");
      const comparisonTargetParameterValues = parameters[comparisonTargetName];
      if (comparisonTargetParameterValues != null) {
        const index = comparisonTargetParameterValues.findIndex(
          (element) => element === target.value,
        );
        if (index !== -1) {
          return `@${comparisonTargetName}_${index} `;
        } else {
          let newIndex =
            parameters[comparisonTargetName].push(target.value) - 1;

          return `@${comparisonTargetName}_${newIndex} `;
        }
      } else {
        parameters[comparisonTargetName] = [target.value];
        return `@${comparisonTargetName}_0`;
      }

    case "column":
      return `${containerAlias}.${target.column}`;

    case "variable":
      variables[comparisonTarget] = `vars["${target.name}"]`;
      return `vars["${target.name}"]`;
  }
}

function serializeSqlParameters(
  parameters: SqlParameters,
): cosmos.SqlParameter[] {
  let sqlParameters: cosmos.SqlParameter[] = [];

  for (const comparisonTarget in parameters) {
    const comparisonTargetValues = parameters[comparisonTarget];

    for (let i = 0; i < comparisonTargetValues.length; i++) {
      sqlParameters.push({
        name: `@${comparisonTarget}_${i}`,
        value: comparisonTargetValues[i],
      });
    }
  }

  return sqlParameters;
}

export function translateWhereExpression(
  collectionAlias: string,
  whereExpression: WhereExpression,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  switch (whereExpression.kind) {
    case "simpleWhereExpression":
      return translateColumnPredicate(
        collectionAlias,
        whereExpression.column,
        whereExpression.operator,
        whereExpression.value,
        parameters,
        variables,
      );

    case "and":
      if (whereExpression.expressions.length > 0) {
        return whereExpression.expressions
          .map(
            (e) =>
              `(${translateWhereExpression(collectionAlias, e, parameters, variables)})`,
          )
          .join(" AND ");
      } else {
        return "true";
      }

    case "or":
      if (whereExpression.expressions.length > 0) {
        return whereExpression.expressions
          .map(
            (e) =>
              `(${translateWhereExpression(collectionAlias, e, parameters, variables)})`,
          )
          .join(" OR ");
      } else {
        return "false";
      }

    case "exists":
      console.log("whereExpression", whereExpression);
      if (whereExpression.expression) {
        return `EXISTS(SELECT VALUE 1 FROM
                ${whereExpression.nestedCollectionPredicateColumn.prefix}
                IN ${collectionAlias}.${whereExpression.nestedCollectionPredicateColumn.columnName}
                WHERE ${translateWhereExpression(
                  whereExpression.nestedCollectionPredicateColumn.prefix,
                  whereExpression.expression,
                  parameters,
                  variables,
                )})`;
      } else {
        return `EXISTS(SELECT VALUE 1 FROM a in ${collectionAlias}.${whereExpression.nestedCollectionPredicateColumn.columnName})`;
      }

    case "not":
      return `(NOT (${translateWhereExpression(collectionAlias, whereExpression.expression, parameters, variables)})) `;
  }
}

// Function to recursively build the nested query part
function buildNestedFieldPredicate(
  nestedField: string[],
  currentFieldPrefix: string,
  currentField: string,
  value: ComparisonValue | undefined,
  operator: ComparisonScalarDbOperator,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  let comparisonTarget = `${currentFieldPrefix}.${currentField}`;

  for (const nestedFieldElement of nestedField) {
    comparisonTarget += `.${nestedFieldElement}`;
  }

  console.log("compoiarson target ", comparisonTarget);

  if (value) {
    const comparisonValueRef = visitComparisonValue(
      parameters,
      variables,
      value,
      comparisonTarget,
      currentFieldPrefix,
    );

    // abstract the logic for infix and prefix operators in a function to avoid code duplication
    if (operator.isInfix) {
      return `${comparisonTarget} ${operator.name} ${comparisonValueRef}`;
    } else {
      return `${operator.name}(${comparisonTarget}, ${comparisonValueRef})`;
    }
  } else {
    if (operator.isUnary) {
      return `${operator.name}(${comparisonTarget})`;
    } else {
      throw new sdk.InternalServerError(
        "Value is undefined where a value was expected",
      );
    }
  }
  // switch (nestedField.kind) {
  //   case "object":
  //     const alias = `${parentField}.${(nestedField as NestedObjectField).field}`;
  //     return buildNestedFieldPredicate(
  //       nestedField.nestedField,
  //       alias,
  //       arrayCounter,
  //       value,
  //       operator,
  //       parameters,
  //       variables,
  //     );
  //   case "scalar":
  //     if (value === undefined) {
  //       if (operator.isUnary) {
  //         return `${operator.name}(${parentField}.${nestedField.field})`;
  //       } else {
  //         throw new sdk.InternalServerError(
  //           "Value is undefined where a value was expected",
  //         );
  //       }
  //     } else {
  //       const comparisonValueRef = visitComparisonValue(
  //         parameters,
  //         variables,
  //         value,
  //         nestedField.field,
  //         parentField,
  //       );
  //       // abstract the logic for infix and prefix operators in a function to avoid code duplication
  //       if (operator.isInfix) {
  //         return `${parentField}.${(nestedField as NestedScalarField).field} ${operator.name} ${comparisonValueRef}`;
  //       } else {
  //         return `${operator.name}(${parentField}.${(nestedField as NestedScalarField).field}, ${comparisonValueRef})`;
  //       }
  //     }
  // }
}

// Function to generate the SQL query
export function translateColumnPredicate(
  prefix: string,
  column: PredicateColumn,
  operator: ComparisonScalarDbOperator,
  value: ComparisonValue | undefined,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  const { name, fieldPath, type } = column;

  // Initial alias for the top-level field
  const topLevelAlias = prefix + "." + name;
  let query = "";
  let predicate = "";
  if (!fieldPath) {
    if (value !== undefined) {
      const comparisonValueRef = visitComparisonValue(
        parameters,
        variables,
        value,
        name,
        prefix,
      );
      if (operator.isInfix) {
        predicate = `${topLevelAlias} ${operator.name} ${comparisonValueRef}`;
      } else {
        predicate = `${operator.name}(${topLevelAlias}, ${comparisonValueRef})`;
      }
      query = predicate;
    } else if (operator.isUnary) {
      predicate = `${operator.name}(${topLevelAlias})`;
    } else {
      throw new sdk.InternalServerError(
        "Binary comparison operator requires a value to be provided",
      );
    }
  } else {
    query = buildNestedFieldPredicate(
      fieldPath,
      prefix,
      name,
      value,
      operator,
      parameters,
      variables,
    );
  }

  return `${query.trim()}`;
}

// Function to get the scalar type of a column,
// if the column is nested, it will return the scalar type of the nested field
function visitNestedObjectField(
  fieldNames: string[],
  parentFieldType: schema.TypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): schema.NamedScalarTypeDefinition {
  if (fieldNames.length === 0) {
    throw new sdk.BadRequest("Field path cannot be empty");
  }

  return handleNestedObjectFieldType(
    fieldNames,
    parentFieldType,
    parentObjectName,
    collectionsSchema,
  );
}

function handleNestedObjectFieldType(
  fieldNames: string[],
  fieldType: schema.TypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): schema.NamedScalarTypeDefinition {
  switch (fieldType.type) {
    case "array":
      throw new sdk.BadRequest(
        `Expected field ${parentObjectName} to be an object or scalar field, but it is an array`,
      );
    case "nullable":
      return handleNullableType(
        fieldNames,
        fieldType,
        parentObjectName,
        collectionsSchema,
      );
    case "named":
      return handleNamedType(
        fieldNames,
        fieldType,
        parentObjectName,
        collectionsSchema,
      );
  }
}

function handleNullableType(
  fieldNames: string[],
  fieldType: schema.NullableTypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): schema.NamedScalarTypeDefinition {
  return handleNestedObjectFieldType(
    fieldNames,
    fieldType.underlyingType,
    parentObjectName,
    collectionsSchema,
  );
}

function handleNamedType(
  fieldNames: string[],
  fieldType: schema.NamedTypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): schema.NamedScalarTypeDefinition {
  switch (fieldType.kind) {
    case "object":
      return handleObjectType(
        fieldNames,
        fieldType,
        parentObjectName,
        collectionsSchema,
      );
    case "scalar":
      return handleScalarType(fieldNames, fieldType);
  }
}

function handleObjectType(
  fieldNames: string[],
  fieldType: schema.NamedObjectTypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): schema.NamedScalarTypeDefinition {
  const [currentFieldName, ...remainingFields] = fieldNames;
  const parentObjectType: schema.ObjectTypeDefinition =
    collectionsSchema.objectTypes[fieldType.name];

  if (!parentObjectType) {
    throw new sdk.BadRequest(
      `Could not find the object ${fieldType.name} in the schema`,
    );
  }

  const currentFieldDefn = parentObjectType.properties[currentFieldName];

  if (!currentFieldDefn) {
    throw new sdk.NotSupported(
      `Field ${currentFieldName} does not exist in the object ${parentObjectName}`,
    );
  }

  switch (currentFieldDefn.type.type) {
    case "named":
      switch (currentFieldDefn.type.kind) {
        case "object":
          return handleNestedObjectFieldType(
            remainingFields,
            currentFieldDefn.type,
            currentFieldName,
            collectionsSchema,
          );
        case "scalar":
          return handleScalarType(
            [currentFieldName, ...remainingFields],
            currentFieldDefn.type,
          );
      }
    case "array":
      throw new sdk.BadRequest(
        `Field ${currentFieldName} is an array field, it cannot have nested fields`,
      );
    case "nullable":
      return handleNestedObjectFieldType(
        remainingFields,
        currentFieldDefn.type.underlyingType,
        currentFieldName,
        collectionsSchema,
      );
  }
}

function handleScalarType(
  fieldNames: string[],
  fieldType: schema.NamedScalarTypeDefinition,
): schema.NamedScalarTypeDefinition {
  if (fieldNames.length > 1) {
    throw new sdk.BadRequest(
      `Scalar field ${fieldNames[0]} cannot have nested fields`,
    );
  }

  return fieldType;
}

export function nestedCollectionComparisonTarget(
  predicate_subquery_counter: number,
  columnName: string,
  fieldPath: string[],
  schema: schema.CollectionsSchema,
  collectionObject: schema.ObjectTypePropertiesMap,
): [NestedCollectionPredicateColumn, number] {
  const currentColumnType = collectionObject[columnName].type;

  if (fieldPath.length > 0) {
    // 1. ALl the elements in the field path except the last one should be an object, the last one should be an array.
    // 2. Traverse over the field path and look up the name of the column in the object and get its type from there.

    function traverseFieldPath(
      currentFieldPath: string[],
      lastObject: schema.ObjectTypePropertiesMap,
    ): [NestedCollectionPredicateColumn, number] {
      if (currentFieldPath.length === 1) {
        const currentField = lastObject[currentFieldPath[0]];
        if (!currentField) {
          throw new sdk.BadRequest(
            `Field ${currentFieldPath[0]} specified in the field path does not exist.`,
          );
        } else {
          console.log("current field is ", currentField);
          if (currentField.type.type !== "array") {
            throw new sdk.BadRequest(
              "The comparison target of an nested collection must be of the array type",
            );
          } else {
            return [
              {
                prefix: `__predicate_subquery_${currentFieldPath[0]}_${predicate_subquery_counter++}`,
                columnName,
                fieldPath,
                type: currentField.type,
              },
              predicate_subquery_counter,
            ];
          }
        }
      } else {
        const [headRemainingPath, ...tailRemainingPath] = currentFieldPath;

        const currentField = lastObject[headRemainingPath];

        if (
          currentField.type.type === "named" &&
          currentField.type.kind === "object"
        ) {
          const currentObj = schema.objectTypes[currentField.type.name];
          return traverseFieldPath(tailRemainingPath, currentObj.properties);
        } else {
          throw new sdk.BadRequest(
            `Intermediate Field path element ${headRemainingPath} is not of type object`,
          );
        }
      }
    }

    const columnBaseType = getBaseType(currentColumnType);

    const currentObject = schema.objectTypes[columnBaseType];

    if (!currentObject) {
      throw new sdk.BadRequest(
        `Could not find the object type corresponding to the field: ${columnBaseType}`,
      );
    }

    return traverseFieldPath(fieldPath, currentObject.properties);
  } else {
    if (currentColumnType.type !== "array") {
      throw new sdk.BadRequest(
        "The comparison target of an nested collection must be of the array type",
      );
    } else {
      return [
        {
          prefix: `__predicate_subquery_${columnName}_${predicate_subquery_counter++}`,
          columnName,
          fieldPath,
          type: currentColumnType,
        },
        predicate_subquery_counter,
      ];
    }
  }
}
