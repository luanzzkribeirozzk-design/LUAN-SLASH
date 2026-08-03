import { useState, useRef, useEffect, useCallback } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// YouTube search using Invidious API (no API key needed, open source)
const INVIDIOUS_INSTANCES = [
  "https://vid.puffyan.us/api/v1",
  "https://invidious.fdn.fr/api/v1",
  "https://inv.nadeko.net/api/v1",
  "https://yt.artemislena.eu/api/v1",
  "https://invidious.nerdvpn.de/api/v1",
  "https://iv.datura.network/api/v1",
  "https://yewtu.be/api/v1",
];

async function searchYouTube(query: string): Promise<YouTubeVideo[]> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&type=video`);
      if (!res.ok) continue;
      const data = await res.json();
      return data.map((item: any) => ({
        id: item.videoId,
        title: item.title,
        author: item.author,
        thumbnail: item.videoThumbnails?.[2]?.url || `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
        lengthSeconds: item.lengthSeconds,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

interface YouTubeVideo {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  lengthSeconds: number;
}

// Piped API as alternative
const PIPED_INSTANCES = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://pipedapi.leptons.xyz",
];

async function searchPiped(query: string): Promise<YouTubeVideo[]> {
  for (const instance of PIPED_INSTANCES) {
    try {
      const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=videos`);
      if (!res.ok) continue;
      const data = await res.json();
      return (data.items || []).map((item: any) => ({
        id: item.url.replace("/watch?v=", ""),
        title: item.title,
        author: item.uploaderName,
        thumbnail: item.thumbnail,
        lengthSeconds: item.duration || 0,
      }));
    } catch {
      continue;
    }
  }
  return [];
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MusicPlayer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<YouTubeVideo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);
  const playerInterval = useRef<any>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    (window as any).onYouTubeIframeAPIReady = () => {
      console.log("YouTube API ready");
    };
  }, []);

  // Initialize player when video changes
  useEffect(() => {
    if (!currentVideo) return;

    const initPlayer = () => {
      if (typeof (window as any).YT === "undefined" || !(window as any).YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      // Destroy old player
      if (playerRef.current) {
        playerRef.current.destroy();
      }

      playerRef.current = new (window as any).YT.Player("yt-player", {
        videoId: currentVideo.id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            setPlayerReady(true);
            e.target.setVolume(volume * 100);
            e.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (e: any) => {
            if (e.data === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startInterval();
            } else if (e.data === (window as any).YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              clearInterval(playerInterval.current);
            } else if (e.data === (window as any).YT.PlayerState.ENDED) {
              setIsPlaying(false);
              clearInterval(playerInterval.current);
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      clearInterval(playerInterval.current);
    };
  }, [currentVideo]);

  const startInterval = useCallback(() => {
    clearInterval(playerInterval.current);
    playerInterval.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 500);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setShowResults(true);

    try {
      let videos = await searchYouTube(searchQuery);
      if (videos.length === 0) {
        videos = await searchPiped(searchQuery);
      }
      setResults(videos);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const playVideo = (video: YouTubeVideo) => {
    setCurrentVideo(video);
    setShowResults(false);
    setPlayerReady(false);
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      setCurrentTime(time);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (playerRef.current) {
      playerRef.current.setVolume(vol * 100);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#121212] text-white flex flex-col overflow-hidden">
      {/* Hidden YouTube player */}
      <div id="yt-player" className="absolute -top-[2000px] -left-[2000px] w-[1px] h-[1px]" />

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-[#121212] border-b border-white/5">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
        </div>
        <h1 className="text-lg font-bold tracking-tight">Music Player</h1>
      </header>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar música, artista..."
              className="w-full bg-white/10 text-white placeholder-white/40 px-4 py-3 rounded-full outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="bg-green-500 hover:bg-green-400 text-black font-bold px-5 py-3 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {/* Search results */}
        {showResults && results.length > 0 && (
          <div className="mt-2">
            <h2 className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-3">Resultados</h2>
            <div className="space-y-1">
              {results.map((video) => (
                <button
                  key={video.id}
                  onClick={() => playVideo(video)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/10 transition-colors text-left group"
                >
                  <div className="relative w-14 h-14 rounded overflow-hidden flex-shrink-0 bg-white/5">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <svg className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="white">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{video.title}</p>
                    <p className="text-xs text-white/50 truncate">{video.author}</p>
                  </div>
                  {video.lengthSeconds > 0 && (
                    <span className="text-xs text-white/40 flex-shrink-0">{formatTime(video.lengthSeconds)}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {showResults && results.length === 0 && !loading && (
          <div className="mt-8 text-center text-white/40 text-sm">
            Nenhum resultado encontrado. Tente outro termo.
          </div>
        )}

        {/* Empty state */}
        {!showResults && !currentVideo && (
          <div className="flex flex-col items-center justify-center h-64 text-white/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="mb-3">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
            <p className="text-sm">Busque uma música para começar</p>
          </div>
        )}

        {/* Now playing info */}
        {currentVideo && !showResults && (
          <div className="flex flex-col items-center mt-6">
            <div className="w-48 h-48 rounded-lg overflow-hidden shadow-2xl shadow-black/50 mb-5 bg-white/5">
              <img
                src={currentVideo.thumbnail}
                alt={currentVideo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-lg font-bold text-center px-4 mb-1">{currentVideo.title}</h2>
            <p className="text-sm text-white/50 mb-6">{currentVideo.author}</p>
          </div>
        )}
      </div>

      {/* Bottom player bar */}
      {currentVideo && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-white/10 px-4 py-2 z-50">
          {/* Progress bar */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-white/40 w-8 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1 accent-green-500 cursor-pointer"
              style={{ background: `linear-gradient(to right, #22c55e ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.1) 0%)` }}
            />
            <span className="text-[10px] text-white/40 w-8">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Left: song info (mobile) */}
            <div className="flex items-center gap-2 w-24">
              <img src={currentVideo.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{currentVideo.title}</p>
                <p className="text-[10px] text-white/40 truncate">{currentVideo.author}</p>
              </div>
            </div>

            {/* Center: controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform active:scale-95"
              >
                {isPlaying ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="black">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Right: volume */}
            <div className="flex items-center gap-1 w-24 justify-end">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="opacity-50">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolume}
                className="w-16 h-1 accent-green-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <MusicPlayer />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
