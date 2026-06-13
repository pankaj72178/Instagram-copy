import Link from "next/link";
import Image from "next/image";
import FollowButton from "./FollowButton";

export type UserListItem = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
  followState: "self" | "following" | "requested" | "none";
};

export default function UserList({
  users,
  emptyText = "Nobody here yet.",
}: {
  users: UserListItem[];
  emptyText?: string;
}) {
  if (users.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">{emptyText}</p>;
  }
  return (
    <ul className="divide-y divide-zinc-800">
      {users.map((u) => (
        <li key={u.username} className="flex items-center gap-3 py-3">
          <Link href={`/${u.username}`} className="shrink-0">
            {u.avatarUrl ? (
              <Image src={u.avatarUrl} alt={u.username} width={44} height={44} unoptimized className="h-11 w-11 rounded-full object-cover ring-1 ring-zinc-800" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-950 font-bold text-indigo-400">
                {u.username[0]?.toUpperCase()}
              </span>
            )}
          </Link>
          <Link href={`/${u.username}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{u.username}</p>
            <p className="truncate text-sm text-zinc-400">{u.displayName}</p>
          </Link>
          {u.followState !== "self" && (
            <FollowButton
              username={u.username}
              initialState={u.followState}
              followsMe={false}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
