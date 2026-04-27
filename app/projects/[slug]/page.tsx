import { Workspace } from "@/components/workspace";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <Workspace projectSlug={slug} />;
}
