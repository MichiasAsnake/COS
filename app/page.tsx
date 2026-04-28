import { redirect } from "next/navigation";
import { listProjects } from "@/lib/http/projects";

export const dynamic = "force-dynamic";

export default async function Home() {
  let projects: Awaited<ReturnType<typeof listProjects>>;

  try {
    projects = await listProjects();
  } catch {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 520 }}>
          <h1>COS workspace is not connected yet.</h1>
          <p>Configure the server environment and open a persisted project to start the workflow.</p>
        </div>
      </main>
    );
  }

  if (projects[0]) redirect(`/projects/${projects[0].slug}`);

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 520 }}>
        <h1>No active projects yet.</h1>
        <p>Create a project through the workspace once the backend is configured.</p>
      </div>
    </main>
  );
}
