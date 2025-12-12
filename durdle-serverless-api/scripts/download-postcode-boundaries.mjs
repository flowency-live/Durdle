/**
 * Download UK postcode boundary GeoJSON files from GitHub
 * Source: https://github.com/missinglink/uk-postcode-polygons
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/missinglink/uk-postcode-polygons/master/geojson';
const OUTPUT_DIR = path.join(process.cwd(), 'postcode-boundaries');

// All UK postcode areas (~120 total)
const UK_POSTCODE_AREAS = [
  // England
  'AB', 'AL', 'B', 'BA', 'BB', 'BD', 'BH', 'BL', 'BN', 'BR', 'BS', 'CA', 'CB', 'CF', 'CH', 'CM', 'CO', 'CR', 'CT', 'CV', 'CW',
  'DA', 'DE', 'DH', 'DL', 'DN', 'DT', 'DY',
  'E', 'EC', 'EN', 'EX',
  'FY',
  'GL', 'GU',
  'HA', 'HD', 'HG', 'HP', 'HR', 'HS', 'HU', 'HX',
  'IG', 'IP',
  'KA', 'KT', 'KW', 'KY',
  'L', 'LA', 'LD', 'LE', 'LL', 'LN', 'LS', 'LU',
  'M', 'ME', 'MK', 'ML',
  'N', 'NE', 'NG', 'NN', 'NP', 'NR', 'NW',
  'OL', 'OX',
  'PA', 'PE', 'PH', 'PL', 'PO', 'PR',
  'RG', 'RH', 'RM',
  'S', 'SA', 'SE', 'SG', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SR', 'SS', 'ST', 'SW', 'SY',
  'TA', 'TD', 'TF', 'TN', 'TQ', 'TR', 'TS', 'TW',
  'UB',
  'W', 'WA', 'WC', 'WD', 'WF', 'WN', 'WR', 'WS', 'WV',
  'YO',
  // Scotland
  'DD', 'DG', 'EH', 'FK', 'G', 'IV', 'ZE',
  // Wales (additional)
  'SY', 'LD', 'SA', 'CF', 'NP',
  // Northern Ireland
  'BT',
  // Channel Islands & Isle of Man
  'GY', 'JE', 'IM'
];

// Remove duplicates
const UNIQUE_AREAS = [...new Set(UK_POSTCODE_AREAS)];

async function downloadFile(area) {
  const url = `${GITHUB_RAW_BASE}/${area}.geojson`;
  const outputPath = path.join(OUTPUT_DIR, `${area}.geojson`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`  [SKIP] ${area} - not found (${response.status})`);
      return null;
    }

    const data = await response.text();
    await writeFile(outputPath, data);

    const sizeKB = (data.length / 1024).toFixed(1);
    console.log(`  [OK] ${area}.geojson (${sizeKB} KB)`);
    return { area, size: data.length };
  } catch (error) {
    console.log(`  [ERROR] ${area} - ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Downloading UK postcode boundary GeoJSON files...\n');

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const results = [];
  let downloaded = 0;
  let failed = 0;

  // Download in batches of 10 to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < UNIQUE_AREAS.length; i += batchSize) {
    const batch = UNIQUE_AREAS.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(downloadFile));

    for (const result of batchResults) {
      if (result) {
        results.push(result);
        downloaded++;
      } else {
        failed++;
      }
    }
  }

  // Summary
  const totalSize = results.reduce((sum, r) => sum + r.size, 0);
  console.log('\n--- Summary ---');
  console.log(`Downloaded: ${downloaded} files`);
  console.log(`Failed/Skipped: ${failed} files`);
  console.log(`Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Output: ${OUTPUT_DIR}`);

  // Create manifest
  const manifest = {
    generated: new Date().toISOString(),
    source: 'https://github.com/missinglink/uk-postcode-polygons',
    areas: results.map(r => r.area).sort(),
    totalFiles: results.length,
    totalSizeBytes: totalSize
  };

  await writeFile(
    path.join(OUTPUT_DIR, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('\nManifest created: manifest.json');
}

main().catch(console.error);
