const COMPANY = "Geo Shalmani Company";

const raw = (col, row) => {
  const v = col.value ? col.value(row) : row[col.key];
  return v === undefined ? null : v;
};

const isNumeric = (col) => col.type && col.type !== "text";

const num = (n, plus = false) => {
  const v = Number(n);
  const s = Math.abs(v).toLocaleString("en-PK", { maximumFractionDigits: 2 });
  return v < 0 ? `-${s}` : plus && v > 0 ? `+${s}` : s;
};

// Text for PDF cells. Latin only: the standard PDF font cannot draw arrows or the unicode minus.
function text(col, v) {
  if (v === null || v === undefined || v === "") return "";
  let out;
  switch (col.type) {
    case "money":
    case "compact":
    case "number":
      out = num(v);
      break;
    case "signed":
    case "delta":
      out = num(v, true);
      break;
    case "percent":
      out = `${Number(v).toFixed(1)}%`;
      break;
    default:
      out = String(v);
  }
  return out.replace(/[^\x20-\x7E\xA0-\xFF]/g, "-");
}

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

async function toPdf({
  title,
  subtitle,
  columns,
  rows,
  totals,
  filename,
  landscape,
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(COMPANY, 40, 42);
  doc.setFontSize(12);
  doc.text(text({}, title), 40, 62);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  if (subtitle) doc.text(text({}, subtitle), 40, 78);
  doc.text(
    `Generated: ${new Date().toLocaleDateString("en-GB")}`,
    width - 40,
    42,
    { align: "right" },
  );

  const head = [columns.map((c) => text({}, c.header))];
  const body = rows.map((r) => columns.map((c) => text(c, raw(c, r))));
  const foot = totals
    ? [
        columns.map((c, i) =>
          i === 0 ? "Total" : text(c, totals[c.key] ?? null),
        ),
      ]
    : undefined;

  autoTable(doc, {
    startY: 92,
    head,
    body,
    foot,
    showFoot: "lastPage",
    styles: {
      fontSize: columns.length > 9 ? 7.5 : 9,
      cellPadding: 4,
      textColor: [31, 41, 55],
    },
    headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" }, // green-800
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [i, isNumeric(c) ? { halign: "right" } : {}]),
    ),
    didParseCell: (data) => {
      if (data.section === "body" && rows[data.row.index]?._bold) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [243, 244, 246];
      }
    },
    didDrawPage: (data) => {
      doc.setFontSize(8.5);
      doc.text(`Page ${data.pageNumber}`, width - 40, height - 20, {
        align: "right",
      });
    },
  });

  doc.save(`${filename}.pdf`);
}

const NUM_FORMAT = {
  money: "#,##0.00",
  compact: "#,##0.00",
  signed: "#,##0.00;[Red]-#,##0.00",
  delta: "+#,##0.00;-#,##0.00;0.00",
  number: "#,##0.##",
  percent: '0.0"%"',
};

async function toExcel({
  title,
  subtitle,
  columns,
  rows,
  totals,
  filename,
  sheetName,
}) {
  const mod = await import("exceljs");
  const ExcelJS = mod.default ?? mod;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(
    (sheetName || title).replace(/[\\/*?:[\]]/g, "").slice(0, 31) || "Report",
  );

  ws.addRow([COMPANY]).font = { bold: true, size: 14 };
  ws.addRow([title]).font = { bold: true, size: 12 };
  if (subtitle) ws.addRow([subtitle]);
  ws.addRow([`Generated: ${new Date().toLocaleDateString("en-GB")}`]);
  ws.addRow([]);

  const headerRow = ws.addRow(columns.map((c) => c.header));
  headerRow.eachCell((cell, i) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF166534" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: isNumeric(columns[i - 1]) ? "right" : "left",
      wrapText: true,
    };
  });

  const cells = (row) =>
    columns.map((c) => {
      const v = raw(c, row);
      if (isNumeric(c)) return v === null || v === "" ? null : Number(v);
      return v === null ? "" : String(v);
    });

  for (const row of rows) {
    const r = ws.addRow(cells(row));
    r.eachCell({ includeEmpty: true }, (cell, i) => {
      const c = columns[i - 1];
      if (c && NUM_FORMAT[c.type]) cell.numFmt = NUM_FORMAT[c.type];
      if (row._bold) cell.font = { bold: true };
    });
  }

  if (totals) {
    const t = ws.addRow(
      columns.map((c, i) => (i === 0 ? "Total" : (totals[c.key] ?? null))),
    );
    t.eachCell({ includeEmpty: true }, (cell, i) => {
      const c = columns[i - 1];
      cell.font = { bold: true };
      cell.border = { top: { style: "thin" } };
      if (c && NUM_FORMAT[c.type]) cell.numFmt = NUM_FORMAT[c.type];
    });
  }

  columns.forEach((c, i) => {
    const longest = Math.max(
      String(c.header).length,
      ...rows.map((r) => text(c, raw(c, r)).length),
      totals ? text(c, totals[c.key] ?? null).length : 0,
    );
    ws.getColumn(i + 1).width = Math.min(Math.max(longest + 2, 10), 48);
  });

  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${filename}.xlsx`,
  );
}

/**
 * config: { format: "pdf" | "excel", title, subtitle, columns, rows, totals, filename, landscape, sheetName }
 * columns: [{ key, header, type: text|money|compact|signed|delta|number|percent, value?: row => x }]
 * rows may set _bold: true. totals is an object keyed like the columns.
 */
export async function exportReport({ format, ...config }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const options = {
    ...config,
    filename: `geo-shalmani-${config.filename}-${stamp}`,
  };
  if (format === "pdf") return toPdf(options);
  return toExcel(options);
}
