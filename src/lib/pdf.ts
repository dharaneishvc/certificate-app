import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import type { CredentialPayload, VerificationState } from "./types";

const WIDTH = 842; // A4 landscape
const HEIGHT = 595;

// Standard PDF fonts only support WinAnsi; replace anything else rather than crash.
function safe(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = rgb(0.1, 0.1, 0.15)) {
  const t = safe(text);
  page.drawText(t, { x: (WIDTH - font.widthOfTextAtSize(t, size)) / 2, y, size, font, color });
}

function fitSize(text: string, font: PDFFont, start: number, min: number, maxWidth: number) {
  let size = start;
  while (size > min && font.widthOfTextAtSize(safe(text), size) > maxWidth) size -= 1;
  return size;
}

export async function renderCredentialPdf(opts: {
  payload: CredentialPayload;
  verifyUrl: string;
  accentColor: string;
  state: VerificationState;
}): Promise<Uint8Array> {
  const { payload, verifyUrl, state } = opts;
  const accent = hexToRgb(opts.accentColor);
  const gray = rgb(0.42, 0.45, 0.5);

  const pdf = await PDFDocument.create();
  pdf.setTitle(safe(`${payload.title} - ${payload.recipient.name}`));
  pdf.setAuthor(safe(payload.issuer.name));
  pdf.setProducer("Credora");

  const page = pdf.addPage([WIDTH, HEIGHT]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  page.drawRectangle({ x: 18, y: 18, width: WIDTH - 36, height: HEIGHT - 36, borderColor: accent, borderWidth: 4 });
  page.drawRectangle({ x: 28, y: 28, width: WIDTH - 56, height: HEIGHT - 56, borderColor: accent, borderWidth: 0.75 });

  if (payload.issuer.chain.length > 1) centered(page, payload.issuer.chain.join("  /  "), 528, regular, 10, gray);
  centered(page, payload.issuer.name, 502, bold, fitSize(payload.issuer.name, bold, 20, 12, 700), accent);
  centered(page, payload.type.replace(/_/g, " "), 482, regular, 9, gray);

  centered(page, payload.title, 425, bold, fitSize(payload.title, bold, 30, 16, 740));
  centered(page, "This is to certify that", 388, italic, 13, gray);
  centered(page, payload.recipient.name, 345, bold, fitSize(payload.recipient.name, bold, 34, 18, 700), accent);

  let y = 312;
  if (payload.description) {
    for (const line of wrap(safe(payload.description), regular, 12, 620).slice(0, 3)) {
      centered(page, line, y, regular, 12);
      y -= 16;
    }
  }
  y -= 6;
  for (const f of payload.fields.slice(0, 5)) {
    centered(page, `${f.label}: ${f.value}`, y, regular, 12);
    y -= 17;
  }

  const sigs = payload.signatories.slice(0, 3);
  const slot = 190;
  sigs.forEach((s, i) => {
    const x = 60 + i * slot;
    page.drawLine({ start: { x, y: 128 }, end: { x: x + 160, y: 128 }, thickness: 0.75, color: gray });
    page.drawText(safe(s.name), { x, y: 112, size: 11, font: bold });
    if (s.title) page.drawText(safe(s.title), { x, y: 98, size: 9, font: regular, color: gray });
  });

  const issued = new Date(payload.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const expiry = payload.expiresAt
    ? `  -  Valid until ${new Date(payload.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
    : "";
  page.drawText(safe(`Issued ${issued}${expiry}`), { x: 60, y: 62, size: 9, font: regular, color: gray });
  page.drawText(`Credential ID: ${payload.id}`, { x: 60, y: 48, size: 9, font: bold, color: gray });

  const qr = await pdf.embedPng(await QRCode.toBuffer(verifyUrl, { margin: 1, width: 300, errorCorrectionLevel: "M" }));
  page.drawImage(qr, { x: WIDTH - 140, y: 52, width: 90, height: 90 });
  const scan = "Scan to verify";
  page.drawText(scan, { x: WIDTH - 95 - regular.widthOfTextAtSize(scan, 8) / 2, y: 42, size: 8, font: regular, color: gray });

  if (state !== "VALID") {
    page.drawText(state, {
      x: 210,
      y: 160,
      size: 96,
      font: bold,
      color: rgb(0.85, 0.1, 0.1),
      opacity: 0.18,
      rotate: degrees(25),
    });
  }

  return pdf.save();
}
