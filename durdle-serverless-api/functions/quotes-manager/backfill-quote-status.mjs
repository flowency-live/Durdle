#!/usr/bin/env node

// One-time migration script to backfill 'status' field on existing quotes
// Run this AFTER creating the GSI on durdle-quotes-dev table
//
// Usage:
//   node backfill-quote-status.mjs

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'eu-west-2' }));
const TABLE_NAME = 'durdle-quotes-dev';

async function backfillQuoteStatus() {
  console.log('Starting quote status backfill...');
  console.log(`Table: ${TABLE_NAME}`);
  console.log('');

  let totalProcessed = 0;
  let totalUpdated = 0;
  let lastEvaluatedKey = null;

  do {
    // Scan table in batches
    const scanParams = {
      TableName: TABLE_NAME,
      Limit: 100,
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    console.log(`Scanning batch (processed so far: ${totalProcessed})...`);
    const scanResult = await client.send(new ScanCommand(scanParams));

    if (!scanResult.Items || scanResult.Items.length === 0) {
      console.log('No items found in this batch');
      break;
    }

    console.log(`Found ${scanResult.Items.length} items in this batch`);

    // Process each quote
    for (const item of scanResult.Items) {
      totalProcessed++;

      // Skip if status already exists
      if (item.status) {
        console.log(`  [${totalProcessed}] ${item.quoteId}: Already has status (${item.status}), skipping`);
        continue;
      }

      // Calculate status based on expiresAt and bookingId
      const now = new Date();
      const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;

      let status;
      if (item.bookingId) {
        status = 'converted';
      } else if (expiresAt && now > expiresAt) {
        status = 'expired';
      } else {
        status = 'active';
      }

      console.log(`  [${totalProcessed}] ${item.quoteId}: Setting status to '${status}'`);

      // Update item with status
      try {
        await client.send(
          new UpdateCommand({
            TableName: TABLE_NAME,
            Key: { quoteId: item.quoteId },
            UpdateExpression: 'SET #status = :status',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: { ':status': status },
          })
        );

        totalUpdated++;
        console.log(`  [${totalProcessed}] ${item.quoteId}: ✓ Updated successfully`);
      } catch (error) {
        console.error(`  [${totalProcessed}] ${item.quoteId}: ✗ Update failed: ${error.message}`);
      }
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey;
    console.log('');
  } while (lastEvaluatedKey);

  console.log('='.repeat(60));
  console.log('Backfill complete!');
  console.log(`Total quotes processed: ${totalProcessed}`);
  console.log(`Total quotes updated: ${totalUpdated}`);
  console.log(`Total quotes skipped (already had status): ${totalProcessed - totalUpdated}`);
  console.log('='.repeat(60));
}

// Run the migration
backfillQuoteStatus()
  .then(() => {
    console.log('Migration successful');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
