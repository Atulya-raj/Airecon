import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";
import LoginClient from "./LoginClient";

export const metadata = {
  title: "Sign In — AI-Recon",
  description: "Sign in to access your financial reconciliation workspace.",
};

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginClient />;
}
