import ExcelJS from 'exceljs';

/**
 * Parse Excel files (.xlsx, .xls) and convert to CSV-like text format
 * Uses ExcelJS which is a maintained, secure library
 */
export async function parseExcelFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  
  await workbook.xlsx.load(arrayBuffer);
  
  let content = "";
  
  workbook.eachSheet((worksheet, sheetId) => {
    const rows: string[] = [];
    
    worksheet.eachRow((row, rowNumber) => {
      const cellValues: string[] = [];
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        // Handle different cell value types
        let value = '';
        if (cell.value === null || cell.value === undefined) {
          value = '';
        } else if (typeof cell.value === 'object') {
          if ('text' in cell.value) {
            // Rich text
            value = cell.value.text || '';
          } else if ('result' in cell.value) {
            // Formula with result
            value = String(cell.value.result || '');
          } else if (cell.value instanceof Date) {
            // Date value
            value = cell.value.toISOString().split('T')[0];
          } else {
            value = String(cell.value);
          }
        } else {
          value = String(cell.value);
        }
        
        // Escape commas and quotes for CSV format
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        cellValues.push(value);
      });
      
      rows.push(cellValues.join(','));
    });
    
    content += `Sheet: ${worksheet.name}\n${rows.join('\n')}\n\n`;
  });
  
  return content;
}
