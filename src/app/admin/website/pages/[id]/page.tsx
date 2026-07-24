import { CmsPageEditorClient } from "@/features/admin/components/cms-page-editor-client";

export default async function AdminCmsPageEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CmsPageEditorClient pageId={id} />;
}
