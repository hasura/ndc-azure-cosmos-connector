import { CosmosClient } from '@azure/cosmos'

const cosmosClient = new CosmosClient({
    endpoint: 'https://localhost:8082/',
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
    },
    indexingPolicy: { 
      automatic: true,
      indexingMode: "consistent",
      includedPaths: [
        {
          path: "/*"
        }
      ],
      excludedPaths: [
        {
          path: "/\"_etag\"/?"
        }
      ],
      compositeIndexes: [
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
  })

import prizes_data from './data/data.json' assert { type: 'json' };

var i = 0;

for (const prize of prizes_data) {
    container.items.upsert(prize)
    i++;
}
console.log(i)