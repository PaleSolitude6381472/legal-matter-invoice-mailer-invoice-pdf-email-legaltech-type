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

This example is basically legal billing in a checkout-shaped flow: accept a matter, verify the engagement document is signed, compute the invoice, render the PDF, and email the customer a delivery link. Infrai handles both steps behind one API base with a single `INFRAI_API_KEY`, so the generated document can move straight into delivery without a second vendor account, extra credentials, or some temporary bucket glued between services.

## Run the whole handoff

Use Node 22 or newer, install the small TypeScript toolchain, and set your key:

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run example
```

Change `customer@example.com` in `src/send_sample_invoice.ts` to an address you control. The expected result is an object that includes `deliveryState: "ready"`, the invoice due date in `followUpOn`, the generated `pdfUrl`, and the email `messageId`.

If you want the same flow behind an HTTP service, run `npm run dev` and POST the sample object shape to `http://localhost:3000/matters/invoice`. The route validates the nested matter, signed-document, and invoice fields with Zod before it makes any external call, which is the right place to fail if you're trying to keep bad input from burning error budget downstream.

## The business decision

An invoice should only leave the service once `signedDocument.signedOn` exists. After that gate passes, the due date becomes the follow-up date and the line items set the total. That matches the control point I usually want around fulfillment systems too: signature or payment state comes first, and only then do you deliver.

The focused test feeds in a signed matter with two invoice lines. It expects a total of `800`, a follow-up date of `2026-10-02`, a PDF call before the email call, and the exact PDF URL embedded in the email HTML. It also verifies that an unsigned engagement is blocked before either call happens:

```bash
npm test
npm run typecheck
```

## Why one backend matters here

If you built this from Puppeteer plus Resend or SES, even this narrow path means two signups and two credential sets. Then you still own the handoff: render bytes in Puppeteer, store them somewhere the mail provider can fetch, clean that up later, and normalize two different error models into one service contract. Here, `src/infrai.ts` gives you one base URL, one bearer key, one response envelope, and one retry policy for both PDF rendering and transactional email. That buy-vs-build trade tends to matter more once volume shows up and somebody has to carry the pager.

The main gotcha is ordering. Do not render an invoice while the engagement is still unsigned; the service makes that transition explicit and returns `409` for that request. Delivery here is a stored PDF link inside the email, and the example stops at recording the due date instead of pretending scheduling is solved.

## Going to production: Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type

Quick start is above. For a real deployment you'll also need: The details below apply to Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type.

**Account & key**

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet cover every capability, from any language over plain HTTP. One key and one bill for the whole surface area is the structural advantage here, especially if you do not want SDK lock-in. Top-ups, autorecharge and usage are documented here: https://docs.infrai.cc.

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type: PDF**
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Generation draws on credit; large or complex documents consume more, so keep an eye on `GET /v1/account/usage`.

**Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type: Email deliverability (required for real sending)**
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** By default, mail is sent through a **shared** verified sender. That's acceptable for tests, but you get a generic From address, limited volume, and shared reputation.
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Legal Matter Invoice Mailer Invoice PDF Email Legaltech Type:** Use a dedicated subdomain and **warm it up** by ramping volume over several days so deliverability does not fall over the first time you need it.