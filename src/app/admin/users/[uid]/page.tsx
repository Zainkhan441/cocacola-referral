import { UserDetailClient } from "@/features/admin/components/user-detail-client";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return <UserDetailClient uid={uid} />;
}
