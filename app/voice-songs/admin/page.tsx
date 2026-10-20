import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function AdminRedirect() {
  redirect("/voice-songs/desk/admin");
}
