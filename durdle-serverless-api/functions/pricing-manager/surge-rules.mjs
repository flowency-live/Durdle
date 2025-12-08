import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const client = new DynamoDBClient({ region: 'eu-west-2' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const SURGE_TABLE_NAME = process.env.SURGE_TABLE_NAME || 'durdle-surge-rules-dev';

// Zod schemas for surge rule validation
const SurgeRuleBaseSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  ruleType: z.enum(['specific_dates', 'date_range', 'day_of_week', 'time_of_day']),
  multiplier: z.number().min(1.0).max(3.0, 'Multiplier must be between 1.0 and 3.0'),
  isActive: z.boolean().optional().default(true),
  description: z.string().optional(),
});

const SpecificDatesSchema = SurgeRuleBaseSchema.extend({
  ruleType: z.literal('specific_dates'),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')).min(1, 'At least one date required'),
});

const DateRangeSchema = SurgeRuleBaseSchema.extend({
  ruleType: z.literal('date_range'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD format'),
});

const DayOfWeekSchema = SurgeRuleBaseSchema.extend({
  ruleType: z.literal('day_of_week'),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).min(1, 'At least one day required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // Optional date range constraint
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM format').optional(),
});

const TimeOfDaySchema = SurgeRuleBaseSchema.extend({
  ruleType: z.literal('time_of_day'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM format'),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(), // Optional day constraint
});

// Union schema that validates based on ruleType
const CreateSurgeRuleSchema = z.discriminatedUnion('ruleType', [
  SpecificDatesSchema,
  DateRangeSchema,
  DayOfWeekSchema,
  TimeOfDaySchema,
]);

const UpdateSurgeRuleSchema = z.object({
  name: z.string().min(1).optional(),
  multiplier: z.number().min(1.0).max(3.0).optional(),
  isActive: z.boolean().optional(),
  description: z.string().optional(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  daysOfWeek: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

// Pre-defined templates
const TEMPLATES = {
  'uk-bank-holidays-2025': {
    name: 'UK Bank Holidays 2025',
    ruleType: 'specific_dates',
    multiplier: 1.5,
    dates: [
      '2025-01-01', // New Year's Day
      '2025-04-18', // Good Friday
      '2025-04-21', // Easter Monday
      '2025-05-05', // Early May Bank Holiday
      '2025-05-26', // Spring Bank Holiday
      '2025-08-25', // Summer Bank Holiday
      '2025-12-25', // Christmas Day
      '2025-12-26', // Boxing Day
    ],
    description: 'UK Bank Holidays for 2025 - auto-generated template',
  },
  'uk-bank-holidays-2026': {
    name: 'UK Bank Holidays 2026',
    ruleType: 'specific_dates',
    multiplier: 1.5,
    dates: [
      '2026-01-01', // New Year's Day
      '2026-04-03', // Good Friday
      '2026-04-06', // Easter Monday
      '2026-05-04', // Early May Bank Holiday
      '2026-05-25', // Spring Bank Holiday
      '2026-08-31', // Summer Bank Holiday
      '2026-12-25', // Christmas Day
      '2026-12-28', // Boxing Day (substitute)
    ],
    description: 'UK Bank Holidays for 2026 - auto-generated template',
  },
  'christmas-period': {
    name: 'Christmas & New Year Period',
    ruleType: 'date_range',
    multiplier: 1.5,
    startDate: '2025-12-20',
    endDate: '2026-01-03',
    description: 'Peak Christmas and New Year period',
  },
  'dorset-summer-2025': {
    name: 'Dorset School Summer Holiday 2025',
    ruleType: 'date_range',
    multiplier: 1.25,
    startDate: '2025-07-23',
    endDate: '2025-09-02',
    description: 'Dorset school summer holidays 2025',
  },
  'summer-weekends': {
    name: 'Summer Weekend Peak',
    ruleType: 'day_of_week',
    multiplier: 1.25,
    daysOfWeek: ['friday', 'saturday', 'sunday'],
    startDate: '2025-07-01',
    endDate: '2025-08-31',
    description: 'Weekend peak pricing during summer months',
  },
  'weekend-evenings': {
    name: 'Weekend Evening Peak',
    ruleType: 'day_of_week',
    multiplier: 1.25,
    daysOfWeek: ['friday', 'saturday'],
    startTime: '18:00',
    endTime: '23:59',
    description: 'Evening peak on Friday and Saturday nights',
  },
};

export async function listSurgeRules(headers, logger) {
  logger.info({ event: 'surge_rules_list_start' }, 'Fetching all surge rules');

  const command = new ScanCommand({
    TableName: SURGE_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pkPrefix)',
    ExpressionAttributeValues: {
      ':pkPrefix': 'SURGE_RULE#',
    }
  });

  const result = await ddbDocClient.send(command);

  const rules = (result.Items || []).map(item => ({
    ruleId: item.ruleId,
    name: item.name,
    ruleType: item.ruleType,
    multiplier: item.multiplier,
    isActive: item.isActive,
    description: item.description || '',
    dates: item.dates || [],
    startDate: item.startDate || null,
    endDate: item.endDate || null,
    daysOfWeek: item.daysOfWeek || [],
    startTime: item.startTime || null,
    endTime: item.endTime || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));

  logger.info({
    event: 'surge_rules_list_success',
    count: rules.length,
    activeCount: rules.filter(r => r.isActive).length,
  }, 'Successfully retrieved surge rules');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      rules,
      count: rules.length,
      activeCount: rules.filter(r => r.isActive).length,
    })
  };
}

export async function getSurgeRule(ruleId, headers, logger) {
  logger.info({ event: 'surge_rule_get_start', ruleId }, 'Fetching surge rule by ID');

  const command = new GetCommand({
    TableName: SURGE_TABLE_NAME,
    Key: {
      PK: `SURGE_RULE#${ruleId}`,
      SK: 'METADATA'
    }
  });

  const result = await ddbDocClient.send(command);

  if (!result.Item) {
    logger.warn({ event: 'surge_rule_not_found', ruleId }, 'Surge rule not found');
    return errorResponse(404, 'Surge rule not found', null, headers);
  }

  const rule = {
    ruleId: result.Item.ruleId,
    name: result.Item.name,
    ruleType: result.Item.ruleType,
    multiplier: result.Item.multiplier,
    isActive: result.Item.isActive,
    description: result.Item.description || '',
    dates: result.Item.dates || [],
    startDate: result.Item.startDate || null,
    endDate: result.Item.endDate || null,
    daysOfWeek: result.Item.daysOfWeek || [],
    startTime: result.Item.startTime || null,
    endTime: result.Item.endTime || null,
    createdAt: result.Item.createdAt,
    updatedAt: result.Item.updatedAt,
  };

  logger.info({ event: 'surge_rule_get_success', ruleId }, 'Successfully retrieved surge rule');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(rule)
  };
}

export async function createSurgeRule(requestBody, headers, logger) {
  logger.info({ event: 'surge_rule_create_start' }, 'Creating new surge rule');

  const rawData = JSON.parse(requestBody);

  // Validate with Zod schema
  const validation = CreateSurgeRuleSchema.safeParse(rawData);

  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    logger.warn({
      event: 'surge_rule_validation_error',
      errors,
    }, 'Surge rule creation validation failed');

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Validation failed',
        details: errors
      })
    };
  }

  const data = validation.data;
  const ruleId = randomUUID();
  const now = new Date().toISOString();

  const item = {
    PK: `SURGE_RULE#${ruleId}`,
    SK: 'METADATA',
    ruleId,
    name: data.name,
    ruleType: data.ruleType,
    multiplier: data.multiplier,
    isActive: data.isActive !== undefined ? data.isActive : true,
    description: data.description || '',
    ...(data.dates && { dates: data.dates }),
    ...(data.startDate && { startDate: data.startDate }),
    ...(data.endDate && { endDate: data.endDate }),
    ...(data.daysOfWeek && { daysOfWeek: data.daysOfWeek }),
    ...(data.startTime && { startTime: data.startTime }),
    ...(data.endTime && { endTime: data.endTime }),
    createdAt: now,
    updatedAt: now,
  };

  logger.info({
    event: 'surge_rule_dynamodb_put',
    ruleId,
    ruleType: data.ruleType,
    multiplier: data.multiplier,
  }, 'Creating surge rule in DynamoDB');

  const command = new PutCommand({
    TableName: SURGE_TABLE_NAME,
    Item: item,
  });

  await ddbDocClient.send(command);

  logger.info({
    event: 'surge_rule_create_success',
    ruleId,
    name: data.name,
    ruleType: data.ruleType,
    multiplier: data.multiplier,
  }, 'Surge rule created successfully');

  return {
    statusCode: 201,
    headers,
    body: JSON.stringify({
      message: 'Surge rule created successfully',
      rule: {
        ruleId: item.ruleId,
        name: item.name,
        ruleType: item.ruleType,
        multiplier: item.multiplier,
        isActive: item.isActive,
        description: item.description,
        dates: item.dates || [],
        startDate: item.startDate || null,
        endDate: item.endDate || null,
        daysOfWeek: item.daysOfWeek || [],
        startTime: item.startTime || null,
        endTime: item.endTime || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }
    })
  };
}

export async function updateSurgeRule(ruleId, requestBody, headers, logger) {
  logger.info({ event: 'surge_rule_update_start', ruleId }, 'Updating surge rule');

  const rawData = JSON.parse(requestBody);

  // Validate with Zod schema
  const validation = UpdateSurgeRuleSchema.safeParse(rawData);

  if (!validation.success) {
    const errors = validation.error.errors.map(err => ({
      field: err.path.join('.') || 'root',
      message: err.message,
      code: err.code
    }));

    logger.warn({
      event: 'surge_rule_validation_error',
      ruleId,
      errors,
    }, 'Surge rule update validation failed');

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Validation failed',
        details: errors
      })
    };
  }

  const data = validation.data;

  // Check if rule exists
  const getCommand = new GetCommand({
    TableName: SURGE_TABLE_NAME,
    Key: {
      PK: `SURGE_RULE#${ruleId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    logger.warn({ event: 'surge_rule_update_not_found', ruleId }, 'Surge rule not found');
    return errorResponse(404, 'Surge rule not found', null, headers);
  }

  // Build update expression
  const updates = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  if (data.name !== undefined) {
    updates.push('#name = :name');
    expressionAttributeNames['#name'] = 'name';
    expressionAttributeValues[':name'] = data.name;
  }

  if (data.multiplier !== undefined) {
    updates.push('multiplier = :multiplier');
    expressionAttributeValues[':multiplier'] = data.multiplier;
  }

  if (data.isActive !== undefined) {
    updates.push('isActive = :isActive');
    expressionAttributeValues[':isActive'] = data.isActive;
  }

  if (data.description !== undefined) {
    updates.push('description = :description');
    expressionAttributeValues[':description'] = data.description;
  }

  if (data.dates !== undefined) {
    updates.push('dates = :dates');
    expressionAttributeValues[':dates'] = data.dates;
  }

  if (data.startDate !== undefined) {
    updates.push('startDate = :startDate');
    expressionAttributeValues[':startDate'] = data.startDate;
  }

  if (data.endDate !== undefined) {
    updates.push('endDate = :endDate');
    expressionAttributeValues[':endDate'] = data.endDate;
  }

  if (data.daysOfWeek !== undefined) {
    updates.push('daysOfWeek = :daysOfWeek');
    expressionAttributeValues[':daysOfWeek'] = data.daysOfWeek;
  }

  if (data.startTime !== undefined) {
    updates.push('startTime = :startTime');
    expressionAttributeValues[':startTime'] = data.startTime;
  }

  if (data.endTime !== undefined) {
    updates.push('endTime = :endTime');
    expressionAttributeValues[':endTime'] = data.endTime;
  }

  updates.push('updatedAt = :updatedAt');
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  logger.info({
    event: 'surge_rule_dynamodb_update',
    ruleId,
    fieldsUpdated: Object.keys(data).length,
  }, 'Updating surge rule in DynamoDB');

  const updateCommand = new UpdateCommand({
    TableName: SURGE_TABLE_NAME,
    Key: {
      PK: `SURGE_RULE#${ruleId}`,
      SK: 'METADATA'
    },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: 'ALL_NEW'
  });

  const result = await ddbDocClient.send(updateCommand);

  logger.info({
    event: 'surge_rule_update_success',
    ruleId,
  }, 'Surge rule updated successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Surge rule updated successfully',
      rule: {
        ruleId: result.Attributes.ruleId,
        name: result.Attributes.name,
        ruleType: result.Attributes.ruleType,
        multiplier: result.Attributes.multiplier,
        isActive: result.Attributes.isActive,
        description: result.Attributes.description || '',
        dates: result.Attributes.dates || [],
        startDate: result.Attributes.startDate || null,
        endDate: result.Attributes.endDate || null,
        daysOfWeek: result.Attributes.daysOfWeek || [],
        startTime: result.Attributes.startTime || null,
        endTime: result.Attributes.endTime || null,
        createdAt: result.Attributes.createdAt,
        updatedAt: result.Attributes.updatedAt,
      }
    })
  };
}

export async function deleteSurgeRule(ruleId, headers, logger) {
  logger.info({ event: 'surge_rule_delete_start', ruleId }, 'Deleting surge rule');

  // Check if rule exists first
  const getCommand = new GetCommand({
    TableName: SURGE_TABLE_NAME,
    Key: {
      PK: `SURGE_RULE#${ruleId}`,
      SK: 'METADATA'
    }
  });

  const existingItem = await ddbDocClient.send(getCommand);
  if (!existingItem.Item) {
    logger.warn({ event: 'surge_rule_delete_not_found', ruleId }, 'Surge rule not found');
    return errorResponse(404, 'Surge rule not found', null, headers);
  }

  const deleteCommand = new DeleteCommand({
    TableName: SURGE_TABLE_NAME,
    Key: {
      PK: `SURGE_RULE#${ruleId}`,
      SK: 'METADATA'
    }
  });

  await ddbDocClient.send(deleteCommand);

  logger.info({
    event: 'surge_rule_delete_success',
    ruleId,
    ruleName: existingItem.Item.name,
  }, 'Surge rule deleted successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      message: 'Surge rule deleted successfully',
      ruleId
    })
  };
}

export async function getTemplates(headers, logger) {
  logger.info({ event: 'surge_templates_get' }, 'Fetching available surge rule templates');

  const templates = Object.entries(TEMPLATES).map(([templateId, template]) => ({
    templateId,
    ...template,
  }));

  logger.info({
    event: 'surge_templates_success',
    count: templates.length,
  }, 'Templates retrieved successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      templates,
      count: templates.length,
    })
  };
}

export async function applyTemplate(templateId, requestBody, headers, logger) {
  logger.info({ event: 'surge_template_apply_start', templateId }, 'Applying surge rule template');

  if (!TEMPLATES[templateId]) {
    logger.warn({ event: 'surge_template_not_found', templateId }, 'Template not found');
    return errorResponse(404, 'Template not found', null, headers);
  }

  const template = TEMPLATES[templateId];
  const overrides = requestBody ? JSON.parse(requestBody) : {};

  // Create rule from template with optional overrides
  const ruleData = {
    ...template,
    ...(overrides.multiplier && { multiplier: overrides.multiplier }),
    ...(overrides.name && { name: overrides.name }),
    ...(overrides.isActive !== undefined && { isActive: overrides.isActive }),
  };

  // Create the rule
  return await createSurgeRule(JSON.stringify(ruleData), headers, logger);
}

// Check surge pricing for a specific date/time (used by quotes-calculator)
export async function checkSurgePricing(pickupDateTime) {
  const pickupDate = new Date(pickupDateTime);
  const dayOfWeek = pickupDate.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase();
  const dateString = pickupDate.toISOString().split('T')[0]; // "2025-12-25"
  const timeString = pickupDate.toTimeString().slice(0, 5);  // "14:30"

  // Query all active surge rules
  const command = new ScanCommand({
    TableName: SURGE_TABLE_NAME,
    FilterExpression: 'begins_with(PK, :pkPrefix) AND isActive = :active',
    ExpressionAttributeValues: {
      ':pkPrefix': 'SURGE_RULE#',
      ':active': true,
    }
  });

  const result = await ddbDocClient.send(command);
  const rules = result.Items || [];

  const appliedRules = [];

  for (const rule of rules) {
    let matches = false;

    switch (rule.ruleType) {
      case 'specific_dates':
        matches = rule.dates && rule.dates.includes(dateString);
        break;

      case 'date_range':
        matches = dateString >= rule.startDate && dateString <= rule.endDate;
        break;

      case 'day_of_week':
        if (rule.daysOfWeek && rule.daysOfWeek.includes(dayOfWeek)) {
          // Check optional date range constraint
          if (rule.startDate && rule.endDate) {
            matches = dateString >= rule.startDate && dateString <= rule.endDate;
          } else {
            matches = true;
          }
        }
        break;

      case 'time_of_day':
        if (rule.startTime && rule.endTime) {
          const timeMatches = timeString >= rule.startTime && timeString <= rule.endTime;
          if (timeMatches) {
            // Check optional day of week constraint
            if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
              matches = rule.daysOfWeek.includes(dayOfWeek);
            } else {
              matches = true;
            }
          }
        }
        break;
    }

    // Additional time constraint check for day_of_week rules
    if (matches && rule.ruleType === 'day_of_week' && rule.startTime && rule.endTime) {
      matches = timeString >= rule.startTime && timeString <= rule.endTime;
    }

    if (matches) {
      appliedRules.push({
        ruleId: rule.ruleId,
        name: rule.name,
        multiplier: rule.multiplier
      });
    }
  }

  // Calculate combined multiplier (STACK - multiply together)
  let combinedMultiplier = appliedRules.reduce(
    (acc, rule) => acc * rule.multiplier,
    1.0
  );

  // Cap at 3.0x maximum
  const MAX_MULTIPLIER = 3.0;
  const wasCapped = combinedMultiplier > MAX_MULTIPLIER;
  if (wasCapped) {
    combinedMultiplier = MAX_MULTIPLIER;
  }

  return {
    combinedMultiplier,
    isPeakPricing: combinedMultiplier > 1.0,
    appliedRules,
    wasCapped,
  };
}

function errorResponse(statusCode, message, details = null, headers) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}

export { TEMPLATES };
