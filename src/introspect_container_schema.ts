import { Container, JSONArray } from "@azure/cosmos"

export async function fetch_n_rows_from_container(n: number, container: Container): Promise<JSONArray> {
    const querySpec = {
        query: `SELECT * FROM ${container.id} c ORDER BY c._ts DESC OFFSET 0 LIMIT ${n}`,
        parameters: []
    }
    var response = await container.items.query(querySpec).fetchAll();

    return response.resources
}
