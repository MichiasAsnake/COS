import { handleApplyFeedbackRequest, handleGenerateProductionRequest, handleGetProductionRequest } from "@/lib/http/production";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGetProductionRequest({ projectSlug: slug });
}

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGenerateProductionRequest({ projectSlug: slug });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleApplyFeedbackRequest(request, { projectSlug: slug });
}
