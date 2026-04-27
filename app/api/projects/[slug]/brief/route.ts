import { handleGetBriefRequest, handleParseBriefRequest } from "@/lib/http/projects";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleGetBriefRequest({ projectSlug: slug });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleParseBriefRequest(request, { projectSlug: slug });
}
