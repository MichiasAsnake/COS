import { handleCreateProjectRequest, handleListProjectsRequest } from "@/lib/http/projects";

export async function GET() {
  return handleListProjectsRequest();
}

export async function POST(request: Request) {
  return handleCreateProjectRequest(request);
}
