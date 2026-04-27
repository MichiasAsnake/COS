import { handleExportMarkdownRequest, handleGetExportRequest } from "@/lib/http/review-export";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGetExportRequest({ projectSlug: slug });
}

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleExportMarkdownRequest({ projectSlug: slug });
}
