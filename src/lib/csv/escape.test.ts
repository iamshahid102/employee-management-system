import { describe, expect, it } from "vitest";

import { escapeCsvCell, sanitizeSpreadsheetCell, toCsv } from "@/lib/csv/escape";

describe("sanitizeSpreadsheetCell", () => {
  it("leaves ordinary text untouched", () => {
    expect(sanitizeSpreadsheetCell("Ayesha Khan")).toBe("Ayesha Khan");
  });

  it.each(["=1+1", "+44123", "-42", "@SUM(A1)", "\tvalue", "\rvalue"])(
    "neutralises %s",
    (value) => {
      expect(sanitizeSpreadsheetCell(value)).toBe(`'${value}`);
    },
  );
});

describe("escapeCsvCell", () => {
  it("returns an empty string for null and undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("quotes values containing commas, quotes or newlines", () => {
    expect(escapeCsvCell("Khan, Ayesha")).toBe('"Khan, Ayesha"');
    expect(escapeCsvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("applies formula protection before quoting", () => {
    expect(escapeCsvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(escapeCsvCell("=a,b")).toBe("\"'=a,b\"");
  });
});

describe("toCsv", () => {
  it("writes a CRLF terminated document with a header row", () => {
    const csv = toCsv(["Name", "Note"], [["Ayesha", "a,b"]]);
    expect(csv).toBe('Name,Note\r\nAyesha,"a,b"\r\n');
  });
});
