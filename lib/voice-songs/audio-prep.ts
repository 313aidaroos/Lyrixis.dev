import { mkdtemp, readFile, readdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { runFfmpeg } from "@/lib/ffmpeg";
import { zipStore } from "./zip";

const OWN_VOICE = "ownvoice";

export async function sampleToDatasetZip(audio: Buffer, extension: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "lyx-voice-"));
  try {
    const safeExt = extension.replace(/[^a-z0-9]/gi, "") || "webm";
    const input = join(dir, `sample.${safeExt}`);
    await writeFile(input, audio);
    const pattern = join(dir, "split_%03d.wav");
    await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      input,
      "-ac",
      "1",
      "-ar",
      "48000",
      "-f",
      "segment",
      "-segment_time",
      "10",
      pattern,
    ]);
    const names = (await readdir(dir)).filter((name) => name.startsWith("split_") && name.endsWith(".wav")).sort();
    if (names.length === 0) throw new Error("The sample could not be split into wav files.");
    const files = [];
    for (const name of names) {
      files.push({ name: `dataset/${OWN_VOICE}/${name}`, data: await readFile(join(dir, name)) });
    }
    return zipStore(files);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Mix a converted vocal with an instrumental. Falls back to the vocal file if ffmpeg fails. */
export async function mixVocalAndBed(vocal: Buffer, bed: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "lyx-mix-"));
  try {
    const vocalPath = join(dir, "vocal.mp3");
    const bedPath = join(dir, "bed.mp3");
    const outPath = join(dir, "mix.mp3");
    await writeFile(vocalPath, vocal);
    await writeFile(bedPath, bed);
    await runFfmpeg([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      vocalPath,
      "-i",
      bedPath,
      "-filter_complex",
      "[0:a]volume=1.4[v];[1:a]volume=0.85[b];[v][b]amix=inputs=2:duration=longest:dropout_transition=0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "192k",
      outPath,
    ]);
    return await readFile(outPath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
