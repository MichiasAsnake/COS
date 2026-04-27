import { handleCreateProjectRequest } from "@/lib/http/projects";

export async function POST(request: Request) {
  return handleCreateProjectRequest(request);
}
