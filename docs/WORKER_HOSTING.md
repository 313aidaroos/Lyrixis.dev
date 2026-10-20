# Lyrics processing

Lyrixis runs the lyrics pipeline inside the Vercel function that accepted the upload. `ffmpeg-static` normalizes the audio and Whisper transcribes it. There is no Redis queue and no Railway worker.

`POST /api/tracks` and `POST /api/tracks/:id/retry` call `processTrack` via Next `after()`. The route `maxDuration` is 300 seconds.

The old BullMQ worker, `railway.json`, `Dockerfile.worker`, and `lib/queue.ts` were removed on 2026-10-14.
