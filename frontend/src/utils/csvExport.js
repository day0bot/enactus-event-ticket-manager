/**
 * Utility function to export an array of data objects to a downloadable CSV file in the browser.
 * 
 * @param {string} filename - Name of the exported file (e.g. 'events.csv')
 * @param {Array<Object>} rows - Array of objects to export
 * @param {Array<{header: string, key: string|function}>} columns - Column definition
 */
export function exportToCsv(filename, rows, columns) {
  if (!rows || !rows.length) {
    throw new Error("No data to export");
  }

  // Generate header row
  const headers = columns.map((col) => escapeCsvValue(col.header));
  const csvLines = [headers.join(",")];

  // Generate data rows
  for (const row of rows) {
    const lineValues = columns.map((col) => {
      let rawVal;
      if (typeof col.key === "function") {
        rawVal = col.key(row);
      } else {
        rawVal = row[col.key];
      }
      return escapeCsvValue(rawVal);
    });
    csvLines.push(lineValues.join(","));
  }

  const csvString = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsvValue(val) {
  if (val === null || val === undefined) {
    return '""';
  }
  const str = String(val);
  // If string contains comma, quote, or newline, escape quotes and wrap in quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}
