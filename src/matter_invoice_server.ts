import { createServer } from "node:http";
import { ZodError } from "zod";
import { InfraiError } from "./infrai.js";
import { invoiceRequestSchema, issueMatterInvoice } from "./invoice_workflow.js";

const port = Number(process.env.PORT ?? 3000);

function reply(response: import("node:http").ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/matters/invoice") {
    reply(response, 404, { error: "Not found" });
    return;
  }

  try {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const input = invoiceRequestSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const result = await issueMatterInvoice(input);
    reply(response, 201, result);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      reply(response, 400, { error: "Invalid request body" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      reply(response, status, { error: error.code });
      return;
    }
    if (error instanceof Error && error.message.includes("must be signed")) {
      reply(response, 409, { error: error.message });
      return;
    }
    reply(response, 500, { error: "Invoice could not be issued" });
  }
});

server.listen(port, () => {
  console.log(`Matter invoice service listening on http://localhost:${port}`);
});
