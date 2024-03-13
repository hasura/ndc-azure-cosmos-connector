import axios from 'axios';
import path from "path";
import { getCosmosClient } from "../src/cosmosDb";
import * as fs from 'fs';
import { CosmosClient } from '@azure/cosmos';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

describe('Connector tests', () => {
    const baseDir = path.resolve(__dirname, './requests');
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const dataFile = path.resolve(__dirname, "./data/data.json");
    const testDirs: string[] = [
        path.resolve(baseDir, 'nobelLaureates')
        // path.resolve(baseDir, 'users'), GQL ENGINE DOES NOT SUPPORT YET!
    ];

    async function loadDataFromFile(filePath: string) {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    }

    async function setupDatabase() {
        console.log("Setting up database");
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        // const cosmosClient = getCosmosClient(
        //     "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
        //     "http://localhost:8081"
        // );
        // const client = TableClient.fromConnectionString(
        //     {
        //       allowInsecureConnection: true
        //     }
        //   )
        const cosmosClient = new CosmosClient({
            key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==',
            endpoint: "https://localhost:8081/"
        })
        console.log("Cosmos client created");
        // console.log(cosmosClient)

        // const requestOptions = {
        //     enableScriptLogging: true,
        //     allowInsecureConnection: true
        // };
        const { database } = await cosmosClient.databases.createIfNotExists({
            id: 'ConnectorTest',
            throughput: 400
        })
        console.log("Database created");
        
        // const { container } = await database.containers.createIfNotExists({
        //     id: 'NobelLaureates',
        //     partitionKey: {
        //       paths: [
        //         '/year'
        //       ]
        //     }
        // })
        // let data = await loadDataFromFile(dataFile);

        // for (let item of data) {
        //     container.items.upsert(item);
        // }
    }

    beforeAll(async () => {
        await setupDatabase();
    });

    afterAll(async () => {
    });

    testDirs.forEach((testDir) => {
        describe(`Testing directory: ${testDir}`, () => {
            console.log("test starts")
            const files = fs.readdirSync(testDir);
            console.log(files)
            const testCases = files.map((file) => {
                const filePath = path.join(testDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                // console.log(content)
                const { method, url, request, response } = JSON.parse(content);
                // console.log(request)
                return { filePath, method, url, request, response };
            });
            // console.log("test middle")
            test.each(testCases)('Testing %s', async ({ filePath, method, url, request, response }) => {
                console.log("test middle")
                const apiResponse = await axios({
                    method,
                    url: `http://0.0.0.0:8080/${url}`,
                    data: request
                });
                console.log(apiResponse)
                expect(apiResponse.data).toEqual(response);
                // expect(1 + 1).toBe(2)
            });
            console.log("test ends")
        });
    });
    // jest.setTimeout(30000);
})
