import { CosmosClient } from '@azure/cosmos'

const cosmosClient = new CosmosClient({
    endpoint: 'https://localhost:8083/',
    key: 'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw=='
})

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0

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

import prizes_data from './data/data.json' assert { type: 'json' };

var i = 0;

for (const prize of prizes_data) {
    container.items.upsert(prize)
    i++;
}
console.log(i)