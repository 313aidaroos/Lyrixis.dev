import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, rmSync } from "fs";
import path from "path";
import type { PaymentRow, ReleaseRow, SongRow, TakeRow, UsageRow, VoiceRow } from "./types";

export type BlobRecord = { body: Buffer; contentType: string };

export interface VoiceSongsStore {
  getVoice(userId: string): Promise<VoiceRow | null>;
  saveVoice(row: VoiceRow): Promise<void>;
  listSongs(userId: string): Promise<SongRow[]>;
  getSong(id: string): Promise<SongRow | null>;
  saveSong(row: SongRow): Promise<void>;
  listTakes(songId: string): Promise<TakeRow[]>;
  saveTake(row: TakeRow): Promise<void>;
  listReleases(userId: string): Promise<ReleaseRow[]>;
  listReleaseQueue(): Promise<ReleaseRow[]>;
  getRelease(id: string): Promise<ReleaseRow | null>;
  saveRelease(row: ReleaseRow): Promise<void>;
  findPayment(idempotencyKey: string): Promise<PaymentRow | null>;
  listPayments(userId: string): Promise<PaymentRow[]>;
  savePayment(row: PaymentRow): Promise<void>;
  getUsage(userId: string, period: string): Promise<UsageRow>;
  saveUsage(row: UsageRow): Promise<void>;
  putBlob(objectPath: string, body: Buffer, contentType: string): Promise<void>;
  getBlob(objectPath: string): Promise<BlobRecord | null>;
  deleteUserBlobs(userId: string): Promise<void>;
  getBalance(userId: string): Promise<number>;
  adjustBalance(userId: string, delta: number): Promise<number>;
}

type MemoryShape = {
  voices: VoiceRow[];
  songs: SongRow[];
  takes: TakeRow[];
  releases: ReleaseRow[];
  payments: PaymentRow[];
  usage: UsageRow[];
  balances: Record<string, number>;
  blobs: Record<string, { contentType: string; base64: string }>;
};

const EMPTY = (): MemoryShape => ({
  voices: [],
  songs: [],
  takes: [],
  releases: [],
  payments: [],
  usage: [],
  balances: {},
  blobs: {},
});

export class MemoryStore implements VoiceSongsStore {
  data: MemoryShape;
  constructor(private file?: string, seed?: MemoryShape) {
    this.data = seed ?? EMPTY();
  }

  static load(file: string): MemoryStore {
    if (!existsSync(file)) return new MemoryStore(file);
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as MemoryShape;
      return new MemoryStore(file, { ...EMPTY(), ...parsed });
    } catch {
      return new MemoryStore(file);
    }
  }

  private flush() {
    if (!this.file) return;
    mkdirSync(path.dirname(this.file), { recursive: true });
    const slim: MemoryShape = {
      ...this.data,
      blobs: Object.fromEntries(
        Object.entries(this.data.blobs).map(([key, value]) => [
          key,
          { contentType: value.contentType, base64: value.base64.length > 2_000_000 ? "" : value.base64 },
        ])
      ),
    };
    writeFileSync(this.file, JSON.stringify(slim));
  }

  async getVoice(userId: string) {
    return this.data.voices.find((row) => row.userId === userId && !row.deletedAt) ?? null;
  }
  async saveVoice(row: VoiceRow) {
    const index = this.data.voices.findIndex((item) => item.id === row.id);
    if (index >= 0) this.data.voices[index] = row;
    else this.data.voices.push(row);
    this.flush();
  }
  async listSongs(userId: string) {
    return this.data.songs.filter((row) => row.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async getSong(id: string) {
    return this.data.songs.find((row) => row.id === id) ?? null;
  }
  async saveSong(row: SongRow) {
    const index = this.data.songs.findIndex((item) => item.id === row.id);
    if (index >= 0) this.data.songs[index] = row;
    else this.data.songs.push(row);
    this.flush();
  }
  async listTakes(songId: string) {
    return this.data.takes.filter((row) => row.songId === songId).sort((a, b) => a.takeNumber - b.takeNumber);
  }
  async saveTake(row: TakeRow) {
    const index = this.data.takes.findIndex((item) => item.id === row.id);
    if (index >= 0) this.data.takes[index] = row;
    else this.data.takes.push(row);
    this.flush();
  }
  async listReleases(userId: string) {
    return this.data.releases.filter((row) => row.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async listReleaseQueue() {
    return this.data.releases
      .filter((row) => row.status === "queued" || row.status === "in_review")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async getRelease(id: string) {
    return this.data.releases.find((row) => row.id === id) ?? null;
  }
  async saveRelease(row: ReleaseRow) {
    const index = this.data.releases.findIndex((item) => item.id === row.id);
    if (index >= 0) this.data.releases[index] = row;
    else this.data.releases.push(row);
    this.flush();
  }
  async findPayment(idempotencyKey: string) {
    return this.data.payments.find((row) => row.idempotencyKey === idempotencyKey) ?? null;
  }
  async listPayments(userId: string) {
    return this.data.payments.filter((row) => row.userId === userId);
  }
  async savePayment(row: PaymentRow) {
    const index = this.data.payments.findIndex((item) => item.id === row.id);
    if (index >= 0) this.data.payments[index] = row;
    else this.data.payments.push(row);
    this.flush();
  }
  async getUsage(userId: string, period: string) {
    return (
      this.data.usage.find((row) => row.userId === userId && row.period === period) ?? {
        userId,
        period,
        songsUsed: 0,
        releasesUsed: 0,
        setupCovered: false,
      }
    );
  }
  async saveUsage(row: UsageRow) {
    const index = this.data.usage.findIndex((item) => item.userId === row.userId && item.period === row.period);
    if (index >= 0) this.data.usage[index] = row;
    else this.data.usage.push(row);
    this.flush();
  }
  async putBlob(objectPath: string, body: Buffer, contentType: string) {
    this.data.blobs[objectPath] = { contentType, base64: body.toString("base64") };
    const disk = blobDisk(objectPath);
    mkdirSync(path.dirname(disk), { recursive: true });
    writeFileSync(disk, body);
    writeFileSync(`${disk}.type`, contentType);
    this.flush();
  }
  async getBlob(objectPath: string) {
    const hit = this.data.blobs[objectPath];
    if (hit?.base64) return { body: Buffer.from(hit.base64, "base64"), contentType: hit.contentType };
    const disk = blobDisk(objectPath);
    if (!existsSync(disk)) return null;
    const contentType = existsSync(`${disk}.type`) ? readFileSync(`${disk}.type`, "utf8") : hit?.contentType ?? "application/octet-stream";
    return { body: readFileSync(disk), contentType };
  }
  async deleteUserBlobs(userId: string) {
    for (const key of Object.keys(this.data.blobs)) {
      if (key.startsWith(`${userId}/`)) delete this.data.blobs[key];
    }
    const dir = path.join(blobRoot(), userId);
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
    this.flush();
  }
  async getBalance(userId: string) {
    if (this.data.balances[userId] === undefined) this.data.balances[userId] = 10_000;
    return this.data.balances[userId]!;
  }
  async adjustBalance(userId: string, delta: number) {
    const next = (await this.getBalance(userId)) + delta;
    this.data.balances[userId] = next;
    this.flush();
    return next;
  }
}

function blobRoot() {
  return process.env.VOICE_SONGS_BLOB_DIR || "/tmp/lyrixis-voice-songs";
}

function blobDisk(objectPath: string) {
  const safe = objectPath.replace(/\.\./g, "").replace(/^\/+/, "");
  return path.join(blobRoot(), safe);
}

const globalStore = globalThis as unknown as { __lyrixisVoiceSongs?: MemoryStore };

export function memoryStore(): MemoryStore {
  if (!globalStore.__lyrixisVoiceSongs) {
    const file = process.env.VOICE_SONGS_STATE_FILE || "/tmp/lyrixis-voice-songs-state.json";
    globalStore.__lyrixisVoiceSongs = MemoryStore.load(file);
  }
  return globalStore.__lyrixisVoiceSongs;
}

export function resetMemoryStore() {
  globalStore.__lyrixisVoiceSongs = new MemoryStore();
}

export function listBlobNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}

export function removeFile(file: string) {
  if (existsSync(file)) unlinkSync(file);
}
