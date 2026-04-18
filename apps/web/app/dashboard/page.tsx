import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogOutButton";
import React from "react";

const Dashboard = async () => {
  console.log("--- [Dashboard Page: Access Attempt] ---");

  try {
    const session = await getSession();

    console.log("📦 Session Data:", JSON.stringify(session, null, 2));

    // الشرط الأول: وجود الجلسة
    if (!session || !session.user) {
      console.warn("🚫 Redirecting: Session is null or user object missing");
      redirect("/auth/signin");
    }

    console.log("🎉 Access Granted to Dashboard");

   // في الـ Dashboard
return (
  <div>
    <h1>Welcome: {session.user.name}</h1>
    <LogoutButton /> {/* أضف الزر هنا */}
  </div>
);

  } catch (error: any) {
    // Next.js redirect throws an error, we should not catch it or we must rethrow it
    if (error.digest?.includes('NEXT_REDIRECT')) throw error;
    
    console.error("💥 Dashboard Component Error:", error);
    return <div>Something went wrong while loading the dashboard.</div>;
  }
};

export default Dashboard;
