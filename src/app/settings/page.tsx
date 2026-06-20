import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditProfileForm from "@/components/EditProfileForm";
import AccountActions from "@/components/AccountActions";
import PasswordSettings from "@/components/PasswordSettings";
import ThemeToggle from "@/components/ThemeToggle";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");

  const pw = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

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

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Appearance</h2>
        <ThemeToggle />
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-semibold text-zinc-200">Security</h2>
        <PasswordSettings hasPassword={!!pw?.passwordHash} />
      </section>

      <AccountActions />
    </main>
  );
}
