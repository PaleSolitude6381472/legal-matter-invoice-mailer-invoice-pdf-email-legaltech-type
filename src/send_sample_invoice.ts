import { invoiceRequestSchema, issueMatterInvoice } from "./invoice_workflow.js";

const sample = invoiceRequestSchema.parse({
  matter: {
    id: "matter-1042",
    reference: "Acme trademark filing",
    clientName: "Jordan Lee",
    clientEmail: "chenhua@changba.com",
    openedOn: "2026-09-02",
  },
  signedDocument: {
    title: "Engagement letter",
    signedOn: "2026-09-03",
  },
  invoice: {
    number: "INV-1042",
    currency: "USD",
    issuedOn: "2026-09-18",
    dueOn: "2026-10-02",
    lines: [
      { description: "Trademark search and filing", quantity: 1, unitAmount: 850 },
      { description: "Registry fee", quantity: 1, unitAmount: 350 },
    ],
  },
});

console.log(await issueMatterInvoice(sample));
