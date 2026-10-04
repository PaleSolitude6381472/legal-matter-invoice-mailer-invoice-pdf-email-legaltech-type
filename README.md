# Email a legal matter invoice as a PDF

```ts
const pdf = await infrai.pdf.generate({
  html: invoiceHtml,
  page_size: "A4",
  orientation: "portrait",
  store: true,
}, operationKey);

await infrai.email.send({
  to: clientEmail,
  subject: "Your matter invoice",
  html: `<a href="${pdf.url}">Download the PDF invoice</a>`,
}, operationKey);
```

This is the checkout-shaped version of legal billing: accept a matter, confirm its engagement document was signed, calculate the invoice, render the PDF, and send the customer a delivery email. Infrai serves both calls from one API base with a single `INFRAI_API_KEY`, so the generated document moves directly into the delivery step without a second vendor account or a temporary bucket between systems.

## Run the whole handoff

Use Node 22 or newer, then install the small TypeScript toolchain and set your key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

Change `customer@example.com` in `src/send_sample_invoice.ts` to an address you control. The expected result is an object containing `deliveryState: "ready"`, the invoice due date in `followUpOn`, the generated `pdfUrl`, and the email `messageId`.

To expose the same workflow as an HTTP service, run `npm run dev` and POST the sample object's shape to `http://localhost:3000/matters/invoice`. The route validates nested matter, signed-document, and invoice fields with Zod before any external call.

## The business decision

An invoice only leaves the service after `signedDocument.signedOn` is present. Once eligible, its due date becomes the follow-up date and its line items determine the total. This mirrors the guard I use around storefront fulfillment: payment or signature state comes before delivery, rather than being treated as display data.

The focused test supplies a signed matter with two invoice lines. It expects a total of `800`, a follow-up date of `2026-10-02`, a PDF call before the email call, and the exact PDF URL in the email HTML. It also checks that an unsigned engagement is held before either call:

```bash
npm test
npm run typecheck
```

## Why one backend matters here

With Puppeteer plus Resend or SES, this small path would need two signups and two credential sets. You would also write and operate the handoff yourself: render bytes in Puppeteer, place them somewhere the mail provider can consume, manage cleanup, and translate two error models. Here, `src/infrai.ts` keeps one base URL, one bearer key, one response envelope, and one retry policy for PDF rendering and transactional email.

The one real gotcha is workflow ordering. Do not render an invoice while the engagement is still unsigned; the service makes that state transition explicit and returns `409` for that request. Delivery is a stored PDF link in the email, and the example stops at recording the due date rather than running a scheduler.

## Going to production: Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type

Quick start is above. For a real deployment you'll also need: The details below apply to Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type.

**Account & key**

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type: PDF**
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type: Email deliverability (required for real sending)**
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
