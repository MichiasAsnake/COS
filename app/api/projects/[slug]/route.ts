import { handleGetProjectWorkspaceRequest, handleUpdateProjectRequest } from "@/lib/http/projects";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleGetProjectWorkspaceRequest({ projectSlug: slug });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleUpdateProjectRequest(request, { projectSlug: slug });
}
