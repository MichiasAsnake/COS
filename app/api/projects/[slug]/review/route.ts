import { handleGetReviewRequest, handleRunQAReviewRequest } from "@/lib/http/review-export";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGetReviewRequest({ projectSlug: slug });
}

export async function POST(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleRunQAReviewRequest(request, { projectSlug: slug });
}
