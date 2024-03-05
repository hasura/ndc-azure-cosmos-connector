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
    let selectColumns: string = selectColumnsJSONProjection(sqlGenCtx.fieldsToSelect, containerAlias)
    sqlQueryParts.push(["SELECT", selectColumns].join(" "));
    sqlQueryParts.push(["FROM", containerName, containerAlias].join(" "));

    if (sqlGenCtx.offset != undefined && sqlGenCtx.offset != null) {
        sqlQueryParts.push(["OFFSET", `${sqlGenCtx.offset}`].join(" "))
    }

    if (sqlGenCtx.limit != undefined && sqlGenCtx.limit != null) {
        sqlQueryParts.push(["LIMIT", `${sqlGenCtx.limit}`].join(" "))
    }

    // TODO: Handle the `order_by` clause as well.

    let sqlQuerySpec: SqlQuerySpec = {
        query: sqlQueryParts.join("\n"),
    };

    console.log("The generated query is ", sqlQueryParts.join("\n"));

    return sqlQuerySpec

}

function selectColumnsJSONProjection(fieldsToSelect: AliasColumnMapping, containerAlias: string): string {
    return Object.entries(fieldsToSelect).map(([alias, columnName]) => {
        return `${containerAlias}.${columnName} as ${alias}`
    }).join(",");

}
