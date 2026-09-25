import assert from "node:assert/strict";
import test from "node:test";
import { invoiceRequestSchema, issueMatterInvoice, planInvoice, type InvoiceGateway } from "../src/invoice_workflow.js";

const request = invoiceRequestSchema.parse({
  matter: {
    id: "matter-7",
    reference: "Storefront brand filing",
    clientName: "Avery Chen",
    clientEmail: "avery@example.com",
    openedOn: "2026-09-01",
  },
  signedDocument: { title: "Engagement letter", signedOn: "2026-09-02" },
  invoice: {
    number: "INV-7",
    currency: "USD",
    issuedOn: "2026-09-18",
    dueOn: "2026-10-02",
    lines: [
      { description: "Filing preparation", quantity: 2, unitAmount: 225 },
      { description: "Registry fee", quantity: 1, unitAmount: 350 },
    ],
  },
});

test("a signed matter produces a PDF delivery and due-date follow-up", async () => {
  const calls: string[] = [];
  const gateway = {
    pdf: { generate: async (body: { html: string }) => {
      calls.push(`pdf:${body.html.includes("INV-7")}`);
      return { url: "https://documents.example/invoice.pdf" };
    } },
    email: { send: async (body: { html: string }) => {
      calls.push(`email:${body.html.includes("https://documents.example/invoice.pdf")}`);
      return { message_id: "message-7" };
    } },
  } as InvoiceGateway;

  const result = await issueMatterInvoice(request, gateway);

  assert.deepEqual(calls, ["pdf:true", "email:true"]);
  assert.equal(result.total, 800);
  assert.equal(result.followUpOn, "2026-10-02");
  assert.equal(result.messageId, "message-7");
});

test("an unsigned engagement is held before rendering or email", () => {
  const unsigned = { ...request, signedDocument: { ...request.signedDocument, signedOn: null } };
  assert.throws(() => planInvoice(unsigned), /must be signed/);
});
