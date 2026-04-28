import { handleUpdateProjectRequest } from "@/lib/http/projects";

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handleUpdateProjectRequest(request, { projectSlug: slug });
}
