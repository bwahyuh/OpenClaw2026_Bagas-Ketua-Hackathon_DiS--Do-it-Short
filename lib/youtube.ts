/** Parse common YouTube URL shapes into a video id */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const input = rawUrl.trim();
  if (!input) return null;

  try {
    const url = input.startsWith("http") ? new URL(input) : new URL(`https://${input}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && id.length >= 6 ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host.endsWith(".youtube.com")) {
      const v = url.searchParams.get("v");
      if (v) return v;

      const pathMatch = url.pathname.match(/\/(?:shorts|embed|live)\/([^/?]+)/);
      if (pathMatch?.[1]) return pathMatch[1];
    }
  } catch {
    const fallback = input.match(
      /(?:v=|\/shorts\/|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    );
    if (fallback?.[1]) return fallback[1];
  }

  return null;
}

export type YouTubeVideoInfo = {
  valid: true;
  videoId: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
};

export async function fetchYouTubeVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error("Invalid YouTube URL. Use a watch, Shorts, or youtu.be link.");
  }

  const canonical = `https://www.youtube.com/watch?v=${videoId}`;
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`;

  let title = "YouTube Video";
  let author = "Unknown channel";
  let authorUrl: string | undefined;
  let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const res = await fetch(oembedUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        title?: string;
        author_name?: string;
        author_url?: string;
        thumbnail_url?: string;
      };
      if (data.title) title = data.title;
      if (data.author_name) author = data.author_name;
      if (data.author_url) authorUrl = data.author_url;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch {
    /* oEmbed failed — still return id + default thumbnail */
  }

  return {
    valid: true,
    videoId,
    title,
    author,
    authorUrl,
    thumbnailUrl,
  };
}
