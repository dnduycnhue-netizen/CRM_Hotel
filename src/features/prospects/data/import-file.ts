import "server-only";
import { Readable } from "node:stream";
import ExcelJS from "exceljs";
import { messages } from "@/shared/i18n/vi";
import {
  buildImportRow,
  type ImportField,
  matchImportHeader,
} from "../domain/import-columns";
import { MAX_IMPORT_ROWS } from "../schemas";
import type { ImportRow } from "../schemas";

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export type ParseImportResult =
  | { ok: true; rows: ImportRow[]; ignoredColumns: string[] }
  | { ok: false; message: string };

function cellToText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((part) => part.text).join("");
    }
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value && value.result !== undefined) {
      return cellToText(value.result as ExcelJS.CellValue);
    }
    return "";
  }
  return String(value);
}

/**
 * Đọc file .xlsx / .csv do người dùng tải lên thành các dòng import.
 * Chỉ đọc + chuẩn hóa tên cột, KHÔNG ghi gì vào DB (bước dry-run làm riêng).
 */
export async function parseProspectImportFile(
  file: File,
): Promise<ParseImportResult> {
  if (file.size === 0) {
    return { ok: false, message: messages.prospects.EMPTY_FILE };
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { ok: false, message: messages.prospects.FILE_TOO_LARGE };
  }
  const lower = file.name.toLowerCase();
  const isCsv = lower.endsWith(".csv");
  const isXlsx = lower.endsWith(".xlsx");
  if (!isCsv && !isXlsx) {
    return { ok: false, message: messages.prospects.FILE_TYPE };
  }

  const workbook = new ExcelJS.Workbook();
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (isCsv) {
      // map giữ nguyên chuỗi: mặc định exceljs đổi "+84909..." / "0909..." thành số
      await workbook.csv.read(Readable.from(buffer), {
        map: (value: unknown) => value,
      });
    } else {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    }
  } catch {
    return { ok: false, message: messages.prospects.FILE_UNREADABLE };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { ok: false, message: messages.prospects.EMPTY_FILE };
  }

  const headerRow = sheet.getRow(1);
  const columnMap: Array<ImportField | null> = [];
  const ignoredColumns: string[] = [];
  for (let c = 1; c <= sheet.columnCount; c++) {
    const header = cellToText(headerRow.getCell(c).value)
      .replace(/^﻿/, "")
      .trim();
    const field = matchImportHeader(header);
    columnMap.push(field);
    if (!field && header) ignoredColumns.push(header);
  }
  if (!columnMap.includes("company_name")) {
    return { ok: false, message: messages.prospects.MISSING_NAME_COLUMN };
  }

  const rows: ImportRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const values: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      values.push(cellToText(row.getCell(c).value));
    }
    if (values.every((v) => v.trim() === "")) continue;
    const built = buildImportRow(values, columnMap);
    rows.push({ row_id: String(r), ...built });
    if (rows.length > MAX_IMPORT_ROWS) {
      return { ok: false, message: messages.prospects.TOO_MANY_ROWS };
    }
  }

  if (rows.length === 0) {
    return { ok: false, message: messages.prospects.EMPTY_FILE };
  }
  return { ok: true, rows, ignoredColumns };
}
