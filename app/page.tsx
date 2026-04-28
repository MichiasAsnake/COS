import { redirect } from "next/navigation";
import { RootDisconnectedState, RootProjectEmptyState } from "@/components/root-project-empty";
import { listProjects } from "@/lib/http/projects";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: Awaited<ReturnType<typeof listProjects>>;

  try {
    projects = await listProjects();
  } catch {
    return <RootDisconnectedState />;
  }

  if (projects.length > 0) redirect("/projects");

  return <RootProjectEmptyState />;
}
