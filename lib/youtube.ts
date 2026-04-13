import { YOUTUBE_API_KEY } from '../constants/config';
import { CustomVideo, VideoTag } from '../types';

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'high'): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

interface YouTubeVideoData {
  id: string;
  title: string;
  channelTitle: string;
  duration: string;
  thumbnailUrl: string;
  durationSeconds: number;
}

export async function fetchYouTubeVideoData(videoId: string): Promise<YouTubeVideoData | null> {
  if (!YOUTUBE_API_KEY) {
    // Fallback without API key
    return {
      id: videoId,
      title: 'YouTube Video',
      channelTitle: 'Unknown Channel',
      duration: 'PT0S',
      thumbnailUrl: getYouTubeThumbnail(videoId),
      durationSeconds: 0,
    };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const duration = item.contentDetails.duration;

    return {
      id: videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      duration,
      thumbnailUrl:
        item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        getYouTubeThumbnail(videoId),
      durationSeconds: parseISO8601Duration(duration),
    };
  } catch {
    return null;
  }
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0');
  const minutes = parseInt(match[2] ?? '0');
  const seconds = parseInt(match[3] ?? '0');
  return hours * 3600 + minutes * 60 + seconds;
}

export async function createCustomVideoFromUrl(
  url: string,
  userId: string,
  tags: VideoTag[] = []
): Promise<Omit<CustomVideo, 'id'> | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  const data = await fetchYouTubeVideoData(videoId);
  if (!data) return null;

  return {
    user_id: userId,
    title: data.title,
    youtube_url: url,
    youtube_id: videoId,
    thumbnail: data.thumbnailUrl,
    duration_sec: data.durationSeconds,
    channel_name: data.channelTitle,
    tags,
    added_at: new Date().toISOString(),
    watch_count: 0,
  };
}
