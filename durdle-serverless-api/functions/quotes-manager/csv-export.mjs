// CSV export utility for quotes

// Generate CSV from quotes array
export function generateCSV(quotes) {
  // Define CSV headers
  const headers = [
    'Quote ID',
    'Created Date',
    'Status',
    'Customer Email',
    'Pickup Location',
    'Dropoff Location',
    'Pickup Time',
    'Vehicle Type',
    'Price',
    'Booking ID',
  ];

  // Build CSV rows
  const rows = quotes.map(quote => {
    return [
      formatQuoteId(quote.quoteId),
      formatDateTime(quote.createdAt),
      capitalizeStatus(quote.status),
      quote.customerEmail || '',
      quote.pickupLocation?.address || '',
      quote.dropoffLocation?.address || '',
      formatDateTime(quote.pickupTime),
      formatVehicleType(quote.vehicleType),
      formatPrice(quote.totalPrice),
      quote.bookingId || '',
    ];
  });

  // Combine headers and rows
  const csvLines = [headers, ...rows];

  // Convert to CSV string
  const csvContent = csvLines
    .map(row =>
      row
        .map(field => {
          // Escape fields containing commas, quotes, or newlines
          const fieldStr = String(field);
          if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
            return `"${fieldStr.replace(/"/g, '""')}"`;
          }
          return fieldStr;
        })
        .join(',')
    )
    .join('\n');

  return csvContent;
}

// Format quote ID for display (remove QUOTE# prefix)
function formatQuoteId(quoteId) {
  if (!quoteId) return '';
  return quoteId.replace('QUOTE#', '#');
}

// Format ISO datetime to human-readable format
function formatDateTime(isoString) {
  if (!isoString) return '';

  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch (error) {
    return isoString;
  }
}

// Capitalize status
function capitalizeStatus(status) {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// Format vehicle type for display
function formatVehicleType(vehicleType) {
  if (!vehicleType) return '';

  const typeMap = {
    standard: 'Standard Saloon',
    executive: 'Executive Saloon',
    minibus: 'Minibus (8 seats)',
  };

  return typeMap[vehicleType] || vehicleType;
}

// Format price in GBP
function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return `£${Number(price).toFixed(2)}`;
}

// Generate filename for CSV export
export function generateCSVFilename() {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `durdle-quotes-${dateStr}.csv`;
}
