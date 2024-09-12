import { exec, execSync } from 'child_process';
import { CosmosClient } from '@azure/cosmos';
import net from 'net';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Azure Cosmos DB configuration
const cosmosConfig = {
  endpoint: process.env.AZURE_COSMOS_ENDPOINT,
  key: process.env.AZURE_COSMOS_KEY,
  databaseId: process.env.AZURE_COSMOS_DB_NAME,
  containerId: 'TestNobelLaureates' // Use the existing container
};

// Validate Cosmos DB configuration
Object.entries(cosmosConfig).forEach(([key, value]) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid or missing Cosmos DB configuration: ${key}`);
  }
});

const client = new CosmosClient({ endpoint: cosmosConfig.endpoint, key: cosmosConfig.key });

function readTestData() {
  const testDataPath = path.join(__dirname, 'data', 'data.json');
  try {
    const rawData = fs.readFileSync(testDataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Error reading test data:', error);
    throw error;
  }
}

async function setupCosmosEmulatorDB() {
  // Disable certificate validation for local emulator
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

  console.log('Setting up Azure Cosmos DB...');
  console.log(`Database ID: ${cosmosConfig.databaseId}`);
  console.log(`Container ID: ${cosmosConfig.containerId}`);

  try {
    const { database } = await client.databases.createIfNotExists({ id: cosmosConfig.databaseId });
    const { container } = await database.containers.createIfNotExists(
      {
        id: cosmosConfig.containerId,
        partitionKey: { paths: ['/year'] },
        indexingPolicy: {
          "indexingMode": "consistent",
          "automatic": true,
          "includedPaths": [
            {
              "path": "/*"
            }
          ],
          "excludedPaths": [
            {
              "path": "/\"_etag\"/?"
            }
          ],
          "compositeIndexes": [
            [
              {
                "path": "/overallMotivation",
                "order": "descending"
              },
              {
                "path": "/prize_id",
                "order": "descending"
              }
            ],
            [
              {
                "path": "/overallMotivation",
                "order": "ascending"
              },
              {
                "path": "/prize_id",
                "order": "descending"
              }
            ],
            [
              {
                "path": "/year",
                "order": "ascending"
              },
              {
                "path": "/prize_id",
                "order": "ascending"
              }
            ],
            [
              {
                "path": "/year",
                "order": "ascending"
              },
              {
                "path": "/prize_id",
                "order": "descending"
              }
            ]
          ]
        }
      });

    console.log('Deleting existing data...');
    const { resources: items } = await container.items.readAll().fetchAll();
    if (items.length > 0) {
      for (const item of items) {
        await container.item(item.id, item.year).delete();
      }
      console.log(`${items.length} items deleted.`);
    }

    console.log('Inserting new test data...');
    const newItems = readTestData();
    for (const item of newItems) {
      await container.items.create(item);
    }
    console.log(`${newItems.length} items inserted.`);
    console.log('Data setup completed.');
  } catch (error) {
    console.error('Error setting up Cosmos DB:', error);
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    if (error.body) {
      console.error('Error details:', error.body);
    }
    throw error;
  }
}

function findVacantPort(startPort = 8000) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        findVacantPort(startPort + 1).then(resolve, reject);
      } else {
        reject(err);
      }
    });
  });
}

async function runTests(setupEmulatorData) {
  const projectRoot = path.resolve(__dirname, '..');
  const logFile = path.join(projectRoot, 'server-output.log');
  let serverProcess = null;

  try {
    if (setupEmulatorData) {
      await setupCosmosEmulatorDB();
    } else {
      console.log('Skipping Cosmos DB setup as --setup-emulator-data flag is not set.');
    }

    console.log('Running CLI update...');
    execSync('npm run cli update', { stdio: 'inherit', cwd: projectRoot });
    console.log('CLI update completed.');

    const port = await findVacantPort();
    console.log(`Found vacant port: ${port}`);

    const startCommand = `npm run start serve -- --configuration . --port ${port} | jq -R -r '. as $line | try fromjson catch $line'`;
    const testCommand = `ndc-test replay --endpoint http://0.0.0.0:${port} --snapshots-dir ${path.join(projectRoot, 'ndc-test-snapshots')}`;

    console.log('Starting server...');
    serverProcess = exec(startCommand, { cwd: projectRoot });

    // Save server output to file
    const logStream = fs.createWriteStream(logFile);
    serverProcess.stdout.pipe(logStream);
    serverProcess.stderr.pipe(logStream);

    // Wait for server to start (adjust timeout as needed)
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Running tests...');
    execSync(testCommand, { stdio: 'inherit', cwd: projectRoot });

    console.log('Tests completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);

    // Output contents of log file
    console.error('Server output:');
    try {
      const logContents = fs.readFileSync(logFile, 'utf8');
      console.error(logContents);
    } catch (readError) {
      console.error('Failed to read server output log:', readError);
    }
    throw error; // Re-throw the error to be caught in the main function
  } finally {
    // Terminate the server process
    if (serverProcess) {
      console.log('Terminating server process...');
      serverProcess.kill('SIGTERM');
    }

    // Clean up log file
    try {
      fs.unlinkSync(logFile);
    } catch (unlinkError) {
      console.error('Failed to remove log file:', unlinkError);
    }

    console.log('Test setup script completed.');
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const setupData = args.includes('--setup-emulator-data');

    await runTests(setupData);
    process.exit(0); // Successful execution
  } catch (error) {
    console.error('An error occurred in the main function:', error);
    process.exit(1); // Exit with error status
  }
}

main();
