import { redirect } from "next/navigation";

// No public marketing site — this platform is the authenticated application
// only. Visiting "/" always sends straight to the login/sign-up flow.
export default function Home() {
  redirect("/login");
}
