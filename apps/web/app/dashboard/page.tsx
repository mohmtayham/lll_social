import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogOutButton";
import React from "react";
import Link from "next/link";

const Dashboard = async () => {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">Welcome: {session.user.name}</h1>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/messages"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Open Messages
        </Link>
        <LogoutButton />
      </div>
    </div>
  );
};

export default Dashboard;
