/**
 * UK Postcodes Data Loader
 *
 * Loads UK outward codes into durdle-uk-postcodes-dev DynamoDB table.
 *
 * Usage:
 *   node load-uk-postcodes.mjs [--file=path/to/data.json]
 *
 * Default: loads uk-postcodes-dorset.json from same directory
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REGION = 'eu-west-2';
const TABLE_NAME = 'durdle-uk-postcodes-dev';
const BATCH_SIZE = 25; // DynamoDB BatchWrite limit

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function loadPostcodes(filePath) {
  console.log(`Loading postcodes from: ${filePath}`);

  // Read and parse JSON file
  const fileContent = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(fileContent);

  if (!data.codes || !Array.isArray(data.codes)) {
    throw new Error('Invalid data format: expected { codes: [...] }');
  }

  console.log(`Found ${data.codes.length} postcode records`);

  // Transform to DynamoDB items
  const items = data.codes.map(code => ({
    PK: `OUTWARD#${code.outwardCode}`,
    SK: 'METADATA',
    outwardCode: code.outwardCode,
    lat: code.lat,
    lon: code.lon,
    area: code.area,
    region: code.region,
    isDorset: code.isDorset ?? false,
    createdAt: new Date().toISOString(),
  }));

  // Batch write in chunks of 25
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item }
        }))
      }
    };

    try {
      const result = await docClient.send(new BatchWriteCommand(params));

      // Check for unprocessed items
      const unprocessed = result.UnprocessedItems?.[TABLE_NAME]?.length || 0;
      successCount += batch.length - unprocessed;
      errorCount += unprocessed;

      if (unprocessed > 0) {
        console.warn(`Warning: ${unprocessed} items were not processed in batch ${Math.floor(i / BATCH_SIZE) + 1}`);
      }

      console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(items.length / BATCH_SIZE)} complete`);
    } catch (error) {
      console.error(`Error in batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      errorCount += batch.length;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Total records: ${items.length}`);
  console.log(`Successfully loaded: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Table: ${TABLE_NAME}`);

  // Count by region
  const regionCounts = {};
  const dorsetCount = items.filter(i => i.isDorset).length;
  items.forEach(i => {
    regionCounts[i.region] = (regionCounts[i.region] || 0) + 1;
  });

  console.log('\nBy region:');
  Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).forEach(([region, count]) => {
    console.log(`  ${region}: ${count}`);
  });
  console.log(`\nDorset postcodes: ${dorsetCount}`);
  console.log(`Non-Dorset postcodes: ${items.length - dorsetCount}`);
}

// Main execution
const args = process.argv.slice(2);
const fileArg = args.find(a => a.startsWith('--file='));
const filePath = fileArg
  ? fileArg.split('=')[1]
  : join(__dirname, 'uk-postcodes-dorset.json');

loadPostcodes(filePath)
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to load postcodes:', error);
    process.exit(1);
  });
