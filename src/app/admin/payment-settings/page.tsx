import { PaymentSettingsForm } from "@/features/admin/components/payment-settings-form";

export default function AdminPaymentSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment settings</h1>
        <p className="text-sm text-white/50">
          The one central Easypaisa account users pay into for deposits and package purchases.
        </p>
      </div>

      <PaymentSettingsForm />
    </div>
  );
}
