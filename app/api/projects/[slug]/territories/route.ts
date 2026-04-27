import { handleGenerateTerritoriesRequest, handleGetTerritoriesRequest, handleSelectTerritoryRequest } from "@/lib/http/direction";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGetTerritoriesRequest({ projectSlug: slug });
}

export async function POST(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleGenerateTerritoriesRequest({ projectSlug: slug });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  return handleSelectTerritoryRequest(request, { projectSlug: slug });
}
