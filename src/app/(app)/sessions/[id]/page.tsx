import { SessionViewContent } from "./session-view-content";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionViewContent id={id} />;
}
