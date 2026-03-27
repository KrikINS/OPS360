import * as XLSX from 'xlsx';

/**
 * Utility to export data to XLSX format
 */
export const exportToExcel = (data: Array<Record<string, unknown>>, moduleName: string) => {
  if (!data || data.length === 0) {
    console.error("No data available for export");
    return;
  }

  // Create a worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Create a workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");

  // Format filename: EHA_[ModuleName]_YYYY-MM-DD.xlsx
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `EHA_${moduleName}_${timestamp}.xlsx`;

  // Process data for export
  XLSX.writeFile(workbook, filename);
};

/**
 * Legacy support or quick CSV exports if needed
 * Note: Recommending exportToExcel for production quality
 */
export const exportToCSV = (data: Array<Record<string, unknown>>, filename: string) => {
  // Keeping this for potential uses where raw text is needed
  if (!data || data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + (val ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.click();
  URL.revokeObjectURL(url);
};
