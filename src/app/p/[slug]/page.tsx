import { PublicCmsPageClient } from "@/features/pages/components/public-cms-page-client";

export default async function PublicCmsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicCmsPageClient slug={slug} />;
}
