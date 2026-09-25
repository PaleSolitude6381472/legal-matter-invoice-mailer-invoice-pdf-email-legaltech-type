import { createHash } from "node:crypto";
import { z } from "zod";
import { infrai } from "./infrai.js";

export const invoiceRequestSchema = z.object({
  matter: z.object({
    id: z.string().min(1),
    reference: z.string().min(1),
    clientName: z.string().min(1),
    clientEmail: z.string().email(),
    openedOn: z.string().date(),
  }),
  signedDocument: z.object({
    title: z.string().min(1),
    signedOn: z.string().date().nullable(),
  }),
  invoice: z.object({
    number: z.string().min(1),
    currency: z.string().length(3),
    issuedOn: z.string().date(),
    dueOn: z.string().date(),
    lines: z.array(z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitAmount: z.number().nonnegative(),
    })).min(1),
  }),
});

export type InvoiceRequest = z.infer<typeof invoiceRequestSchema>;

export type InvoicePlan = {
  deliveryState: "ready";
  followUpOn: string;
  total: number;
};

export function planInvoice(request: InvoiceRequest): InvoicePlan {
  if (!request.signedDocument.signedOn) {
    throw new Error("The engagement document must be signed before invoicing");
  }
  return {
    deliveryState: "ready",
    followUpOn: request.invoice.dueOn,
    total: request.invoice.lines.reduce(
      (sum, line) => sum + line.quantity * line.unitAmount,
      0,
    ),
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function invoiceHtml(request: InvoiceRequest, plan: InvoicePlan): string {
  const rows = request.invoice.lines.map((line) => `
    <tr><td>${escapeHtml(line.description)}</td><td>${line.quantity}</td><td>${money(line.unitAmount, request.invoice.currency)}</td></tr>
  `).join("");
  return `<!doctype html><html><body>
    <h1>Invoice ${escapeHtml(request.invoice.number)}</h1>
    <p>Matter: ${escapeHtml(request.matter.reference)}</p>
    <p>Client: ${escapeHtml(request.matter.clientName)}</p>
    <p>Signed document: ${escapeHtml(request.signedDocument.title)} (${request.signedDocument.signedOn})</p>
    <table><thead><tr><th>Work</th><th>Quantity</th><th>Unit amount</th></tr></thead><tbody>${rows}</tbody></table>
    <p><strong>Total: ${money(plan.total, request.invoice.currency)}</strong></p>
    <p>Due: ${request.invoice.dueOn}</p>
  </body></html>`;
}

export type InvoiceGateway = typeof infrai;

export async function issueMatterInvoice(
  request: InvoiceRequest,
  gateway: InvoiceGateway = infrai,
): Promise<InvoicePlan & { pdfUrl: string; messageId: string }> {
  const plan = planInvoice(request);
  const operation = createHash("sha256")
    .update(`${request.matter.id}:${request.invoice.number}`)
    .digest("hex");

  const pdf = await gateway.pdf.generate({
    html: invoiceHtml(request, plan),
    page_size: "A4",
    orientation: "portrait",
    store: true,
  }, `invoice-pdf-${operation}`);

  const mail = await gateway.email.send({
    to: request.matter.clientEmail,
    subject: `Invoice ${request.invoice.number} for ${request.matter.reference}`,
    html: `<p>Hello ${escapeHtml(request.matter.clientName)},</p>
      <p>Your invoice is ready: <a href="${escapeHtml(pdf.url)}">download the PDF</a>.</p>
      <p>Payment is due ${request.invoice.dueOn}. We will follow up on that date if it remains open.</p>`,
  }, `invoice-email-${operation}`);

  return { ...plan, pdfUrl: pdf.url, messageId: mail.message_id };
}
