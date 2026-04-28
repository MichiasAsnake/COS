import { RootDisconnectedState } from "@/components/root-project-empty";
import { ProjectIndexPage } from "@/components/project-index-page";
import { listProjects } from "@/lib/http/projects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  let projects: Awaited<ReturnType<typeof listProjects>>;

  try {
    projects = await listProjects();
  } catch {
    return <RootDisconnectedState />;
  }

  return <ProjectIndexPage projects={projects} />;
}
