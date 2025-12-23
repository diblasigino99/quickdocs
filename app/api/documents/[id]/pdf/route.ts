import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFImage } from "pdf-lib";

type LineItem = {
  id: string;
  title: string;
  qty: string;
  rate: string;
};

function toNumber(input: string) {
  const cleaned = (input || "").replace(/[^0-9.]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function wrapText(text: string, maxLen: number) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ["—"];
}

async function embedLogo(pdfDoc: PDFDocument, logoDataUrl: string | null) {
  if (!logoDataUrl) return null;
  if (!logoDataUrl.startsWith("data:image/")) return null;

  try {
    const isPng = logoDataUrl.startsWith("data:image/png;base64,");
    const isJpg =
      logoDataUrl.startsWith("data:image/jpeg;base64,") ||
      logoDataUrl.startsWith("data:image/jpg;base64,");

    const base64 = logoDataUrl.split(",")[1] || "";
    const bytes = Buffer.from(base64, "base64");

    const img = isPng
      ? await pdfDoc.embedPng(bytes)
      : isJpg
      ? await pdfDoc.embedJpg(bytes)
      : null;

    return img;
  } catch {
    return null;
  }
}

function drawHeader(opts: {
  page: PDFPage;
  width: number;
  height: number;
  margin: number;
  regular: any;
  bold: any;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  projectTitle: string;
  customerName: string;
  logo?: PDFImage | null;
}) {
  const {
    page,
    width,
    height,
    margin,
    regular,
    bold,
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    projectTitle,
    customerName,
    logo,
  } = opts;

  // Header bar
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: rgb(0.96, 0.97, 0.98),
  });

  // Optional logo (left)
  let leftX = margin;
  if (logo) {
    const box = 48;
    const scale = Math.min(box / logo.width, box / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;

    page.drawImage(logo, {
      x: margin,
      y: height - 78 - h / 2,
      width: w,
      height: h,
    });

    leftX = margin + 62;
  }

  // Company name
  page.drawText(companyName, {
    x: leftX,
    y: height - 56,
    size: 16,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });

  // Contact
  const contactLine = [companyEmail, companyPhone].filter(Boolean).join(" • ");
  if (contactLine) {
    page.drawText(contactLine, {
      x: leftX,
      y: height - 74,
      size: 10,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
    });
  }
  if (companyAddress) {
    page.drawText(companyAddress, {
      x: leftX,
      y: height - 88,
      size: 10,
      font: regular,
      color: rgb(0.45, 0.45, 0.45),
    });
  }

  // Right: Title + Prepared for
  page.drawText(projectTitle, {
    x: width - margin - bold.widthOfTextAtSize(projectTitle, 18),
    y: height - 58,
    size: 18,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });

  const preparedFor = `Prepared for: ${customerName || "—"}`;
  page.drawText(preparedFor, {
    x: width - margin - regular.widthOfTextAtSize(preparedFor, 10),
    y: height - 78,
    size: 10,
    font: regular,
    color: rgb(0.45, 0.45, 0.45),
  });
}

function drawTableHeader(opts: {
  page: PDFPage;
  y: number;
  width: number;
  margin: number;
  bold: any;
}) {
  const { page, y, width, margin, bold } = opts;

  const headerY = y;

  page.drawRectangle({
    x: margin,
    y: headerY - 18,
    width: width - margin * 2,
    height: 24,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.88, 0.88, 0.88),
    borderWidth: 1,
  });

  const colDesc = margin;
  const colQty = margin + 320;
  const colRate = margin + 385;
  const colAmt = margin + 470;

  page.drawText("Description", {
    x: colDesc + 10,
    y: headerY - 12,
    size: 10,
    font: bold,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText("Qty", {
    x: colQty,
    y: headerY - 12,
    size: 10,
    font: bold,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText("Rate", {
    x: colRate,
    y: headerY - 12,
    size: 10,
    font: bold,
    color: rgb(0.35, 0.35, 0.35),
  });
  page.drawText("Amount", {
    x: colAmt,
    y: headerY - 12,
    size: 10,
    font: bold,
    color: rgb(0.35, 0.35, 0.35),
  });

  return headerY - 30; // next y after header
}

function drawFooter(opts: {
  page: PDFPage;
  width: number;
  margin: number;
  regular: any;
  docId: string;
}) {
  const { page, width, margin, regular, docId } = opts;
  const footerY = 60;

  page.drawText(`Document ID: ${docId}`, {
    x: margin,
    y: footerY,
    size: 8.5,
    font: regular,
    color: rgb(0.5, 0.5, 0.5),
  });

  const right = "Generated with QuickDocs";
  page.drawText(right, {
    x: width - margin - regular.widthOfTextAtSize(right, 8.5),
    y: footerY,
    size: 8.5,
    font: regular,
    color: rgb(0.5, 0.5, 0.5),
  });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const url = new URL(request.url);

  // Branding
  const companyName = url.searchParams.get("companyName") || "Your Company";
  const companyEmail = url.searchParams.get("companyEmail") || "";
  const companyPhone = url.searchParams.get("companyPhone") || "";
  const companyAddress = url.searchParams.get("companyAddress") || "";
  const logoDataUrl = url.searchParams.get("logoDataUrl");

  // Doc
  const customerName = url.searchParams.get("customerName") || "—";
  const projectTitle = url.searchParams.get("projectTitle") || "Estimate";

  // Items + tax
  const items = safeJson<LineItem[]>(url.searchParams.get("items"), []);
  const taxRate = toNumber(url.searchParams.get("taxRate") || "0");

  const safeItems =
    Array.isArray(items) && items.length
      ? items
      : [{ id: "x", title: "—", qty: "0", rate: "0" }];

  const subtotal = safeItems.reduce(
    (sum, it) => sum + toNumber(it.qty) * toNumber(it.rate),
    0
  );
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Notes / terms / payment
  const notes = url.searchParams.get("notes") || "";
  const terms = url.searchParams.get("terms") || "";
  const paymentInfo = url.searchParams.get("paymentInfo") || "";

  // PDF setup
  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logo = await embedLogo(pdfDoc, logoDataUrl || null);

  const PAGE_W = 612;
  const PAGE_H = 792;
  const margin = 50;

  const topBodyY = PAGE_H - 155; // after header
  const bottomSafeY = 110; // keep away from footer
  const rowHeight = 22;

  const colDesc = margin;
  const colQty = margin + 320;
  const colRate = margin + 385;

  // Create first page
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  drawHeader({
    page,
    width: PAGE_W,
    height: PAGE_H,
    margin,
    regular,
    bold,
    companyName,
    companyEmail,
    companyPhone,
    companyAddress,
    projectTitle,
    customerName,
    logo,
  });

  let y = topBodyY;

  // Section title
  page.drawText("Line Items", {
    x: margin,
    y,
    size: 12,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 14;

  // Table header
  y = drawTableHeader({ page, y, width: PAGE_W, margin, bold });

  // Helper: new page when needed
  function newPageWithHeader() {
    // Footer previous page
    drawFooter({ page, width: PAGE_W, margin, regular, docId: params.id });

    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    drawHeader({
      page,
      width: PAGE_W,
      height: PAGE_H,
      margin,
      regular,
      bold,
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      projectTitle,
      customerName,
      logo,
    });

    y = topBodyY;

    // Repeat table header on each page
    page.drawText("Line Items (cont.)", {
      x: margin,
      y,
      size: 12,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= 14;
    y = drawTableHeader({ page, y, width: PAGE_W, margin, bold });
  }

  // Draw rows (paginate)
  for (const it of safeItems) {
    // If next row would collide with bottom area, go to a new page
    if (y - rowHeight < bottomSafeY + 120) {
      newPageWithHeader();
    }

    const qty = toNumber(it.qty);
    const rate = toNumber(it.rate);
    const amt = qty * rate;

    // Row separator
    page.drawLine({
      start: { x: margin, y: y - 6 },
      end: { x: PAGE_W - margin, y: y - 6 },
      thickness: 1,
      color: rgb(0.92, 0.92, 0.92),
    });

    const desc = (it.title || "—").slice(0, 60);
    page.drawText(desc, {
      x: colDesc + 10,
      y,
      size: 10.5,
      font: regular,
      color: rgb(0.15, 0.15, 0.15),
    });

    page.drawText(String(it.qty || "—"), {
      x: colQty,
      y,
      size: 10.5,
      font: regular,
      color: rgb(0.2, 0.2, 0.2),
    });

    const rateText = `$${money(rate)}`;
    page.drawText(rateText, {
      x: colRate,
      y,
      size: 10.5,
      font: regular,
      color: rgb(0.2, 0.2, 0.2),
    });

    const amtText = `$${money(amt)}`;
    page.drawText(amtText, {
      x: PAGE_W - margin - 10 - regular.widthOfTextAtSize(amtText, 10.5),
      y,
      size: 10.5,
      font: regular,
      color: rgb(0.15, 0.15, 0.15),
    });

    y -= rowHeight;
  }

  // Now we need space for totals + blocks. If not enough, new page.
  const neededForSummary =
    86 + // totals box height
    12 + // spacing
    (notes.trim() ? 11 + 14 + 12 * Math.min(wrapText(notes, 95).length, 4) + 10 : 0) +
    (terms.trim() ? 11 + 14 + 12 * Math.min(wrapText(terms, 95).length, 5) + 10 : 0) +
    (paymentInfo.trim() ? 11 + 14 + 12 * Math.min(wrapText(paymentInfo, 95).length, 5) + 10 : 0) +
    60; // footer buffer

  if (y - neededForSummary < bottomSafeY) {
    // close out current page and move summary to new page
    newPageWithHeader();
  } else {
    // Otherwise add a divider line before totals
    page.drawLine({
      start: { x: margin, y: y - 8 },
      end: { x: PAGE_W - margin, y: y - 8 },
      thickness: 1,
      color: rgb(0.90, 0.90, 0.90),
    });
    y -= 26;
  }

  // Totals box at current y
  const totalsBoxHeight = 86;
  const totalsY = Math.max(y - totalsBoxHeight + 12, bottomSafeY + 120);

  page.drawRectangle({
    x: margin,
    y: totalsY,
    width: PAGE_W - margin * 2,
    height: totalsBoxHeight,
    color: rgb(0.98, 0.98, 0.99),
    borderColor: rgb(0.88, 0.88, 0.88),
    borderWidth: 1,
  });

  const left = margin + 16;
  const rightX = PAGE_W - margin - 16;

  page.drawText("Subtotal", {
    x: left,
    y: totalsY + 58,
    size: 10,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("Tax", {
    x: left,
    y: totalsY + 38,
    size: 10,
    font: regular,
    color: rgb(0.4, 0.4, 0.4),
  });
  page.drawText("Total", {
    x: left,
    y: totalsY + 14,
    size: 11,
    font: bold,
    color: rgb(0.2, 0.2, 0.2),
  });

  const subText = `$${money(subtotal)}`;
  const taxText = `$${money(tax)} (${taxRate.toFixed(2)}%)`;
  const totalText = `$${money(total)}`;

  page.drawText(subText, {
    x: rightX - regular.widthOfTextAtSize(subText, 10),
    y: totalsY + 58,
    size: 10,
    font: regular,
    color: rgb(0.15, 0.15, 0.15),
  });
  page.drawText(taxText, {
    x: rightX - regular.widthOfTextAtSize(taxText, 10),
    y: totalsY + 38,
    size: 10,
    font: regular,
    color: rgb(0.15, 0.15, 0.15),
  });
  page.drawText(totalText, {
    x: rightX - bold.widthOfTextAtSize(totalText, 14),
    y: totalsY + 12,
    size: 14,
    font: bold,
    color: rgb(0.05, 0.05, 0.05),
  });

  // Detail blocks under totals (paginate if needed)
  y = totalsY - 18;

  function drawBlock(title: string, text: string, maxLines: number) {
    const lines = wrapText(text, 95);
    const use = lines.slice(0, maxLines);

    // Estimate space
    const needed = 14 + 12 * use.length + 10; // title+lines+gap
    if (y - needed < bottomSafeY) {
      newPageWithHeader();
      y = topBodyY; // after header
      // Not repeating "Line Items" here; this page is summary continuation.
      page.drawText("Summary (cont.)", {
        x: margin,
        y,
        size: 12,
        font: bold,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= 18;
    }

    page.drawText(title, {
      x: margin,
      y,
      size: 11,
      font: bold,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 14;

    for (const line of use) {
      page.drawText(line, {
        x: margin,
        y,
        size: 9.5,
        font: regular,
        color: rgb(0.25, 0.25, 0.25),
      });
      y -= 12;
    }
    y -= 10;
  }

  if (notes.trim()) drawBlock("Notes", notes, 6);
  if (terms.trim()) drawBlock("Terms", terms, 8);
  if (paymentInfo.trim()) drawBlock("Payment", paymentInfo, 8);

  // Footer on last page
  drawFooter({ page, width: PAGE_W, margin, regular, docId: params.id });

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${params.id}.pdf"`,
    },
  });
}
