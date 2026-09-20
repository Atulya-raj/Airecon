import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth-session";

export default async function RootPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }
  redirect("/dashboard");
}

