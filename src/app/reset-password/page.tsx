import { redirect } from "next/navigation";

// The reset flow now uses an emailed OTP on /forgot-password. Old reset links
// land here and are forwarded there.
export default function ResetPasswordPage() {
  redirect("/forgot-password");
}
