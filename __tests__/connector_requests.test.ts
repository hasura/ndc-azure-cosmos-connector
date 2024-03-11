import path from "path";
import { getCosmosClient } from "../src/cosmosDb";

describe('Connector tests', () => {
    const baseDir = path.resolve(__dirname, './requests');

    async function setupDatabase() {
        const cosmosClient = getCosmosClient(
            "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
            "localhost:8081"
        );
    }
})
