import { OfficialChannelForm } from "@/features/admin/components/official-channel-form";

export default function AdminChannelPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Official channel</h1>
        <p className="text-sm text-white/50">
          Manage the links and banner shown on the user-facing Official Channel page.
        </p>
      </div>

      <OfficialChannelForm />
    </div>
  );
}
