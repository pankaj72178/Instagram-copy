import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import EditProfileForm from "@/components/EditProfileForm";
import AccountActions from "@/components/AccountActions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Edit profile</h1>
      <EditProfileForm
        initial={{
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          isPrivate: user.isPrivate,
          avatarUrl: user.avatarUrl,
        }}
      />
      <AccountActions />
    </main>
  );
}
