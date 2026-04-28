import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { getProjectWorkspaceData } from "@/lib/http/projects";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const workspace = await getProjectWorkspaceData(slug);

  if (!workspace) notFound();

  return <Workspace workspace={workspace} />;
}
