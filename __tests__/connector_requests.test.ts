import axios from 'axios';
import path from "path";
import { getCosmosClient } from "../src/cosmosDb";
import * as fs from 'fs';

describe('Connector tests', () => {
    const baseDir = path.resolve(__dirname, './requests');

    const dataFile = path.resolve(__dirname, "./data/data.json");
    const testDirs: string[] = [
        path.resolve(baseDir, 'nobelLaureates')
    ];

    async function loadDataFromFile(filePath: string) {
        const data = await fs.promises.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    }

    async function setupDatabase() {
        const cosmosClient = getCosmosClient(
            "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==",
            "https://localhost:8081"
        );
        
        const { database } = await cosmosClient.databases.createIfNotExists({
            id: 'ConnectorTest',
            throughput: 400
        })
        
        const { container } = await database.containers.createIfNotExists({
            id: 'NobelLaureates',
            partitionKey: {
              paths: [
                '/year'
              ]
            }
        })
        let data = await loadDataFromFile(dataFile);

        for (let item of data) {
            container.items.upsert(item);
        }
    }

    beforeAll(async () => {
        await setupDatabase();
    });

    afterAll(async () => {
    });

    testDirs.forEach((testDir) => {
        describe(`Testing directory: ${testDir}`, () => {
            const files = fs.readdirSync(testDir);
            const testCases = files.map((file) => {
                const filePath = path.join(testDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const { method, url, request, response } = JSON.parse(content);
                return { filePath, method, url, request, response };
            });
            test.each(testCases)('Testing %s', async ({ filePath, method, url, request, response }) => {
                const apiResponse = await axios({
                    method,
                    url: `http://0.0.0.0:8080/${url}`,
                    data: request
                });
                expect(apiResponse.data).toEqual(response);
            });
        });
    });
})
