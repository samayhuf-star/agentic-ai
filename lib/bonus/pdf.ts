import PDFDocument from "pdfkit";
import { SWIPE_GROUPS, SWIPE_INTRO } from "@/data/swipe-file";

const BG = "#06080a";
const TEXT = "#eef2f0";
const DIM = "#9aa59f";
const LIME = "#c8f25a";
const AMBER = "#ffc94d";

const GROUP_COLOR: Record<string, string> = {
  sales: LIME,
  support: AMBER,
  operations: "#9ecbff",
};

export function renderSwipePdf(): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 48,
      bufferPages: true,
      info: {
        Title: "Ready-made prompt swipe file",
        Author: "AI Time Machine",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let painting = false;
    const paint = () => {
      if (painting) return;
      painting = true;
      doc.save();
      doc.rect(0, 0, doc.page.width, doc.page.height).fill(BG);
      doc.restore();
      painting = false;
    };
    doc.on("pageAdded", paint);
    paint();

    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.fillColor(LIME).font("Helvetica-Bold").fontSize(11).text("AI TIME MACHINE", { width });
    doc.moveDown(0.6);
    doc.fillColor(TEXT).font("Helvetica-Bold").fontSize(26).text("Ready-made prompt swipe file", { width });
    doc.moveDown(0.45);
    doc.fillColor(DIM).font("Helvetica").fontSize(12).text(SWIPE_INTRO, { width, lineGap: 3 });
    doc.moveDown(0.4);
    doc.fillColor(DIM).font("Helvetica").fontSize(11).text("Paste one prompt. Add your shop name, the item, and the price where the prompt asks. Read the reply and change it before you send anything to a customer.", { width, lineGap: 2 });
    doc.moveDown(1);

    for (const group of SWIPE_GROUPS) {
      const color = GROUP_COLOR[group.id] || LIME;
      ensureSpace(doc, 70);
      doc.fillColor(color).font("Helvetica-Bold").fontSize(18).text(group.label, { width });
      doc.moveDown(0.2);
      doc.strokeColor(color).lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.x + 72, doc.y).stroke();
      doc.moveDown(0.7);
      group.prompts.forEach((prompt, index) => {
        ensureSpace(doc, 88);
        doc.fillColor(color).font("Helvetica-Bold").fontSize(12).text(`${index + 1}. ${prompt.title}`, { width });
        doc.moveDown(0.25);
        doc.fillColor(TEXT).font("Helvetica").fontSize(11).text(prompt.text, { width, lineGap: 2 });
        doc.moveDown(0.85);
      });
      doc.moveDown(0.3);
    }

    ensureSpace(doc, 48);
    doc.fillColor(DIM).font("Helvetica").fontSize(10).text("AI Time Machine · Rizwiz Enterprises. These prompts are drafts. You decide what to send.", { width });
    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
}
