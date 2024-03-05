import * as sdk from "@hasura/ndc-sdk-typescript";
import { SqlQuerySpec } from "@azure/cosmos";

/*
  The key represents the alias of the request field and the
  value represents the name of the column present in the container.
*/
export type AliasColumnMapping = {
    [alias: string]: string
}


export type SqlQueryGenerationContext = {
    fieldsToSelect: AliasColumnMapping,
    limit?: number | null,
    offset?: number | null,
    orderBy?: sdk.OrderBy | null
}

export function generateSqlQuery(sqlGenCtx: SqlQueryGenerationContext, containerName: string, containerAlias: string): SqlQuerySpec {
    let sqlQueryParts: string[] = []
    let selectColumns: string = formatSelectColumns(sqlGenCtx.fieldsToSelect, containerAlias)
    sqlQueryParts.push(["SELECT", selectColumns].join(" "));
    sqlQueryParts.push(["FROM", containerName, containerAlias].join(" "));

    if (sqlGenCtx.orderBy != null && sqlGenCtx.orderBy != null && sqlGenCtx.orderBy.elements.length > 0) {
        const orderByClause = visitOrderByElements(sqlGenCtx.orderBy.elements, containerAlias);
        sqlQueryParts.push(["ORDER BY", orderByClause].join(" "))
    }

    if (sqlGenCtx.offset != undefined && sqlGenCtx.offset != null) {
        sqlQueryParts.push(["OFFSET", `${sqlGenCtx.offset}`].join(" "))
    }

    if (sqlGenCtx.limit != undefined && sqlGenCtx.limit != null) {
        sqlQueryParts.push(["LIMIT", `${sqlGenCtx.limit}`].join(" "))
    }


    let sqlQuerySpec: SqlQuerySpec = {
        query: sqlQueryParts.join("\n"),
    };

    return sqlQuerySpec

}

function formatSelectColumns(fieldsToSelect: AliasColumnMapping, containerAlias: string): string {
    return Object.entries(fieldsToSelect).map(([alias, columnName]) => {
        return `${containerAlias}.${columnName} as ${alias}`
    }).join(",");

}

/*
  Traverses over the order by elements and generates the ORDER BY clause.
  NOTE that this function expects the `values` parameter to be a non-empty list.
 */
function visitOrderByElements(values: sdk.OrderByElement[], containerAlias: string): string {
    if (values.length === 0) {
        throw new sdk.InternalServerError("visit_order_by_elements called with an empty list")
    }
    return values.map(element => visitOrderByElement(element, containerAlias)).join(", ");

}

function visitOrderByElement(value: sdk.OrderByElement, containerAlias: string): string {
    const direction = value.order_direction === 'asc' ? 'ASC' : 'DESC';

    switch (value.target.type) {
        case 'column':
            if (value.target.path.length > 0) {
                throw new sdk.NotSupported("Relationships are not supported in order_by.")
            } else {
                return `${containerAlias}.${value.target.name} ${direction}`
            }

        case 'single_column_aggregate':
            throw new sdk.NotSupported("Order by aggregate is not supported")

        case 'star_count_aggregate':
            throw new sdk.NotSupported("Order by aggregate is not supported")
    }
}
