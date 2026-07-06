import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseExcelFile } from '../src/lib/excelParser';

// Characterization tests for the Excel → CSV-text conversion that feeds the AI
// extractor. Workbooks are built in memory so we can assert escaping, date handling
// and multi-sheet output without shipping real bank files. See docs/epics/uploads.md.

async function workbookToFile(build: (wb: ExcelJS.Workbook) => void): Promise<File> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  const buffer = await wb.xlsx.writeBuffer();
  return new File([buffer], 'statement.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseExcelFile', () => {
  it('converts dates to ISO YYYY-MM-DD', async () => {
    const file = await workbookToFile((wb) => {
      const ws = wb.addWorksheet('Movimientos');
      ws.addRow(['Fecha', 'Concepto', 'Importe']);
      ws.addRow([new Date(Date.UTC(2024, 0, 15)), 'Nomina', 1800]);
    });
    const out = await parseExcelFile(file);
    expect(out).toContain('2024-01-15');
  });

  it('escapes commas and quotes for CSV', async () => {
    const file = await workbookToFile((wb) => {
      const ws = wb.addWorksheet('Movimientos');
      ws.addRow(['Cafe, con leche', 'Text "quoted"']);
    });
    const out = await parseExcelFile(file);
    // comma-containing cell gets wrapped in quotes
    expect(out).toContain('"Cafe, con leche"');
    // inner quotes get doubled
    expect(out).toContain('"Text ""quoted"""');
  });

  it('emits every sheet with a "Sheet:" header', async () => {
    const file = await workbookToFile((wb) => {
      wb.addWorksheet('Enero').addRow(['a', 'b']);
      wb.addWorksheet('Febrero').addRow(['c', 'd']);
    });
    const out = await parseExcelFile(file);
    expect(out).toContain('Sheet: Enero');
    expect(out).toContain('Sheet: Febrero');
  });
});
