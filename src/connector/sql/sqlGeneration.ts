import * as sdk from "@hasura/ndc-sdk-typescript";
import * as cosmos from "@azure/cosmos";
import { SqlQuerySpec } from "@azure/cosmos";
import * as schema from "../schema";

export type Column = {
  name: string;
  prefix: string;
  type?: schema.TypeDefinition; // TODO(KC): Modify this to not be optional
  nestedField?: NestedField;
};

export type SelectContainerColumn = {
  kind: "column";
  column: Column;
};

export type SelectAggregate = {
  kind: "aggregate";
  column: Column;
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

type NestedArrayField = {
  kind: "array";
  field?: string;
  nestedField: NestedField;
};

type NestedScalarField = {
  field: string;
  type: string;
  kind: "scalar";
};

type NestedField = NestedObjectField | NestedArrayField | NestedScalarField;

export type SimpleWhereExpression = {
  kind: "simpleWhereExpression";
  column: Column;
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

export type WhereExpression =
  | SimpleWhereExpression
  | AndWhereExpression
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

export function getScalarType(column: Column): string {
  if (column.nestedField) {
    return getNestedScalarType(column.nestedField);
  } else {
    if (column.type === undefined) {
      throw new sdk.BadRequest(`Couldn't find type of column: ${column.name}`);
    } else {
      switch (column.type.type) {
        case "array":
          throw new sdk.BadRequest(
            `Expected column ${column.name} to be a scalar type, but found array type`,
          );
        case "named":
          if (column.type.kind === "object") {
            throw new sdk.BadRequest(
              `Expected column ${column.name} to be a scalar type, but found object type`,
            );
          } else {
            return column.type.name;
          }
        case "nullable":
          return getScalarType({
            name: column.name,
            prefix: column.prefix,
            type: column.type.underlyingType,
          });
      }
    }
  }
}

function getNestedScalarType(nestedField: NestedField): string {
  switch (nestedField.kind) {
    case "scalar":
      return nestedField.type;
    case "object":
      return getNestedScalarType(nestedField.nestedField);
    case "array":
      return getNestedScalarType(nestedField.nestedField);
  }
}

export function getDbComparisonOperator(
  scalarTypeName: string,
  operator: string,
): ComparisonScalarDbOperator {
  const scalarOperators = scalarComparisonOperatorMappings[scalarTypeName];

  if (scalarOperators === undefined && scalarOperators === null) {
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
      column: Column;
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

  if (sqlQueryCtx.predicate !== null && sqlQueryCtx.predicate !== undefined) {
    const whereExp = translateWhereExpression(
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

export function formatColumn(column: Column) {
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

/*
  Wraps the expression in parantheses to avoid generating SQL with wrong operator precedence.
 */
function visitExpressionWithParentheses(
  parameters: SqlParameters,
  variables: VariablesMappings,
  expression: Expression,
  containerAlias: string,
): string {
  return `(${visitExpression(parameters, variables, expression, containerAlias)})`;
}

function visitExpression(
  parameters: SqlParameters,
  variables: VariablesMappings,
  expression: Expression,
  containerAlias: string,
): string {
  switch (expression.type) {
    case "and":
      if (expression.expressions.length > 0) {
        return expression.expressions
          .map((expr) =>
            visitExpressionWithParentheses(
              parameters,
              variables,
              expr,
              containerAlias,
            ),
          )
          .join(" AND ");
      } else {
        return "true";
      }

    case "or":
      if (expression.expressions.length > 0) {
        return expression.expressions
          .map((expr) =>
            visitExpressionWithParentheses(
              parameters,
              variables,
              expr,
              containerAlias,
            ),
          )
          .join(" OR ");
      } else {
        return "false";
      }

    case "not":
      return `NOT ${visitExpressionWithParentheses(parameters, variables, expression.expression, containerAlias)} `;

    case "unary_comparison_operator":
      let unaryPredicate = "";
      switch (expression.dbOperator.name) {
        case "is_null":
          unaryPredicate = `IS_NULL(${containerAlias}.${expression.column})`;
      }
      return unaryPredicate;

    case "binary_comparison_operator":
      const comparisonValue = visitComparisonValue(
        parameters,
        variables,
        expression.value,
        expression.column,
        containerAlias,
      );

      if (expression.dbOperator.isInfix) {
        return `${containerAlias}.${expression.column} ${expression.dbOperator.name} ${comparisonValue}`;
      } else {
        return `${expression.dbOperator.name}(${containerAlias}.${expression.column}, ${comparisonValue}) `;
      }

    default:
      throw new sdk.InternalServerError("Unknown expression type");
  }
}

export function visitComparisonTarget(
  rootContainerAlias: string,
  target: sdk.ComparisonTarget,
  collectionObject: schema.ObjectTypePropertiesMap,
  collectionObjectName: string,
  schema: schema.CollectionsSchema,
): Column {
  switch (target.type) {
    case "column":
      if (target.path.length > 0) {
        throw new sdk.NotSupported(
          "Relationship fields are not supported in predicates.",
        );
      }

      let nestedField = undefined;

      let comparisonTargetType = collectionObject[target.name].type;

      if (target.field_path && target.field_path.length > 0) {
        let fieldPath = target.field_path;

        nestedField = visitNestedField(
          fieldPath,
          comparisonTargetType,
          collectionObjectName,
          schema,
        );
      }

      return {
        name: target.name,
        prefix: rootContainerAlias,
        type: comparisonTargetType,
        nestedField,
      };

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
      const comparisonTargetName = comparisonTarget.replace(".", "_");
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
  whereExpression: WhereExpression,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  switch (whereExpression.kind) {
    case "simpleWhereExpression":
      return translateColumnPredicate(
        whereExpression.column,
        whereExpression.operator,
        whereExpression.value,
        parameters,
        variables,
      );

    case "and":
      if (whereExpression.expressions.length > 0) {
        return whereExpression.expressions
          .map((e) => `(${translateWhereExpression(e, parameters, variables)})`)
          .join(" AND ");
      } else {
        return "true";
      }

    case "or":
      if (whereExpression.expressions.length > 0) {
        return whereExpression.expressions
          .map((e) => `(${translateWhereExpression(e, parameters, variables)})`)
          .join(" OR ");
      } else {
        return "false";
      }

    case "not":
      return `(NOT (${translateWhereExpression(whereExpression.expression, parameters, variables)})) `;
  }
}

// Function to recursively build the nested query part
function buildNestedFieldPredicate(
  nestedField: NestedField,
  parentField: string,
  arrayCounter: number,
  value: ComparisonValue | undefined,
  operator: ComparisonScalarDbOperator,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  switch (nestedField.kind) {
    case "array":
      const nestedFieldAlias = `array_element_${arrayCounter++}`;
      return `EXISTS(
                SELECT 1
                FROM ${nestedFieldAlias} IN ${parentField}.${nestedField.field}
                WHERE ${buildNestedFieldPredicate(nestedField.nestedField, nestedFieldAlias, arrayCounter, value, operator, parameters, variables)})`;

    case "object":
      const alias = `${parentField}.${(nestedField as NestedObjectField).field}`;
      return buildNestedFieldPredicate(
        nestedField.nestedField,
        alias,
        arrayCounter,
        value,
        operator,
        parameters,
        variables,
      );
    case "scalar":
      if (value === undefined) {
        if (operator.isUnary) {
          return `${operator.name}(${parentField}.${nestedField.field})`;
        } else {
          throw new sdk.InternalServerError(
            "Value is undefined where a value was expected",
          );
        }
      } else {
        const comparisonValueRef = visitComparisonValue(
          parameters,
          variables,
          value,
          nestedField.field,
          parentField,
        );

        // abstract the logic for infix and prefix operators in a function to avoid code duplication
        if (operator.isInfix) {
          return `${parentField}.${(nestedField as NestedScalarField).field} ${operator.name} ${comparisonValueRef}`;
        } else {
          return `${operator.name}(${parentField}.${(nestedField as NestedScalarField).field}, ${comparisonValueRef})`;
        }
      }
  }
}

// Function to generate the SQL query
export function translateColumnPredicate(
  column: Column,
  operator: ComparisonScalarDbOperator,
  value: ComparisonValue | undefined,
  parameters: SqlParameters,
  variables: VariablesMappings,
): string {
  const { name, prefix, nestedField } = column;

  // Initial alias for the top-level field
  const topLevelAlias = prefix + "." + name;
  let query = "";
  let predicate = "";
  if (nestedField === undefined) {
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
    nestedField.field = name;
    query = buildNestedFieldPredicate(
      nestedField,
      prefix,
      1,
      value,
      operator,
      parameters,
      variables,
    );
  }

  return `${query.trim()}`;
}

function visitNestedField(
  fieldNames: string[],
  parentFieldType: schema.TypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): NestedField {
  if (fieldNames.length === 0) {
    throw new sdk.BadRequest("Field path cannot be empty");
  }

  return handleFieldType(
    fieldNames,
    parentFieldType,
    parentObjectName,
    collectionsSchema,
  );
}

function handleFieldType(
  fieldNames: string[],
  fieldType: schema.TypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): NestedField {
  switch (fieldType.type) {
    case "array":
      return handleArrayType(
        fieldNames,
        fieldType,
        parentObjectName,
        collectionsSchema,
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

function handleArrayType(
  fieldNames: string[],
  fieldType: schema.ArrayTypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): NestedArrayField {
  return {
    kind: "array",
    nestedField: handleFieldType(
      fieldNames,
      fieldType.elementType,
      parentObjectName,
      collectionsSchema,
    ),
  };
}

function handleNullableType(
  fieldNames: string[],
  fieldType: schema.NullableTypeDefinition,
  parentObjectName: string,
  collectionsSchema: schema.CollectionsSchema,
): NestedField {
  return handleFieldType(
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
): NestedField {
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
): NestedField {
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
          return {
            kind: "object",
            field: currentFieldName,
            nestedField: handleFieldType(
              remainingFields,
              currentFieldDefn.type,
              currentFieldName,
              collectionsSchema,
            ),
          };
        case "scalar":
          return handleScalarType(
            [currentFieldName, ...remainingFields],
            currentFieldDefn.type,
          );
      }
    case "array":
      return {
        kind: "array",
        field: currentFieldName,
        nestedField: handleFieldType(
          remainingFields,
          currentFieldDefn.type.elementType,
          currentFieldName,
          collectionsSchema,
        ),
      };
    case "nullable":
      return handleFieldType(
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
): NestedScalarField {
  if (fieldNames.length > 1) {
    throw new sdk.BadRequest(
      `Scalar field ${fieldNames[0]} cannot have nested fields`,
    );
  }

  return {
    kind: "scalar",
    field: fieldNames[0],
    type: fieldType.name,
  };
}
