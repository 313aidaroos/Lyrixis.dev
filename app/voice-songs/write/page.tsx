import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function WriteRedirect() {
  redirect("/voice-songs/desk/write");
}
