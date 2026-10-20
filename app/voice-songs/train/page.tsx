import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function TrainRedirect() {
  redirect("/voice-songs/desk/train");
}
