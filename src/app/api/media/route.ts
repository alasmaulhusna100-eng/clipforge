import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { resolveStorage } from "@/lib/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

/** Streams storage media with HTTP Range support (required for video seeking). */
export async function GET(req: NextRequest) {
  const rel = req.nextUrl.searchParams.get("p") ?? "";
  let abs: string;
  try {
    abs = resolveStorage(rel);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  if (!abs || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    return new Response("Not found", { status: 404 });
  }

  const stat = fs.statSync(abs);
  const size = stat.size;
  const type = MIME[path.extname(abs).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range");

  const download = req.nextUrl.searchParams.get("download");
  const dlName = req.nextUrl.searchParams.get("name") ?? path.basename(abs);
  const baseHeaders: Record<string, string> = {
    "Accept-Ranges": "bytes",
    "Content-Type": type,
    "Cache-Control": "no-cache",
  };
  if (download) {
    baseHeaders["Content-Disposition"] = `attachment; filename="${dlName.replace(/[^\w.\- ]/g, "_")}"`;
  }

  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    let start = m && m[1] ? parseInt(m[1], 10) : 0;
    let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (m && !m[1] && m[2]) {
      start = Math.max(0, size - parseInt(m[2], 10));
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416 });
    const stream = fs.createReadStream(abs, { start, end });
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Content-Length": String(end - start + 1),
      },
    });
  }

  const stream = fs.createReadStream(abs);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}
