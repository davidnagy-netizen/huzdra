import { OrderActionError, OrderValidationError, placeOrder } from "@/lib/pipeline/orchestrator";
import { sanitizeWizard } from "@/lib/wizard-schema";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "bad_request" }, { status: 400 });
  try {
    const order = await placeOrder(sanitizeWizard(body.data), { previewId: typeof body.previewId === "string" ? body.previewId : undefined });
    return Response.json(
      { code: order.code, statusKey: order.statusKey, totalHuf: order.price.totalHuf },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OrderActionError) return Response.json({ error: err.message }, { status: 409 });
    if (err instanceof OrderValidationError) {
      return Response.json({ error: "validation", step: err.step, errors: err.errors }, { status: 422 });
    }
    console.error(err);
    return Response.json({ error: "server_error" }, { status: 500 });
  }
}
