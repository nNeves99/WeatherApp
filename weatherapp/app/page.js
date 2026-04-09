"use client";
 
import { useState, useEffect, useCallback } from "react";
import Parse from "parse";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Search,
  Trash2,
  MapPin,
  Thermometer,
  Eye,
  Clock,
  CloudDrizzle,
  CloudFog,
  Loader2,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
 
// Parse SDK Init
const PARSE_APP_ID = process.env.NEXT_PUBLIC_PARSE_APP_ID;
const PARSE_JS_KEY = process.env.NEXT_PUBLIC_PARSE_JS_KEY;
const OWM_API_KEY = process.env.NEXT_PUBLIC_OWM_API_KEY;
 
if (typeof window !== "undefined") {
  Parse.initialize(PARSE_APP_ID, PARSE_JS_KEY);
  Parse.serverURL = "https://parseapi.back4app.com/";
}
 
//  Weather Icon Mapper
function getWeatherIcon(code, size = 64) {
  const props = { size, strokeWidth: 1.5 };
  if (!code) return <Sun {...props} className="text-yellow-300" />;
 
  const id = parseInt(code);
  if (id >= 200 && id < 300) return <CloudLightning {...props} className="text-yellow-200" />;
  if (id >= 300 && id < 400) return <CloudDrizzle {...props} className="text-blue-200" />;
  if (id >= 500 && id < 600) return <CloudRain {...props} className="text-blue-300" />;
  if (id >= 600 && id < 700) return <CloudSnow {...props} className="text-blue-100" />;
  if (id >= 700 && id < 800) return <CloudFog {...props} className="text-slate-300" />;
  if (id === 800) return <Sun {...props} className="text-yellow-300" />;
  if (id > 800) return <Cloud {...props} className="text-slate-200" />;
  return <Sun {...props} className="text-yellow-300" />;
}
 
function getWeatherLabel(code) {
  if (!code) return "Desconhecido";
  const id = parseInt(code);
  if (id >= 200 && id < 300) return "Tempestade";
  if (id >= 300 && id < 400) return "Garoa";
  if (id >= 500 && id < 600) return "Chuva";
  if (id >= 600 && id < 700) return "Neve";
  if (id >= 700 && id < 800) return "Névoa";
  if (id === 800) return "Céu Limpo";
  if (id === 801 || id === 802) return "Poucas Nuvens";
  if (id > 802) return "Nublado";
  return "Desconhecido";
}
 
function getGradient(code) {
  if (!code) return "from-amber-500 via-orange-400 to-yellow-300";
  const id = parseInt(code);
  if (id >= 200 && id < 300) return "from-slate-700 via-purple-800 to-indigo-900";
  if (id >= 300 && id < 600) return "from-slate-600 via-blue-700 to-cyan-800";
  if (id >= 600 && id < 700) return "from-slate-300 via-blue-200 to-indigo-300";
  if (id >= 700 && id < 800) return "from-slate-500 via-slate-400 to-slate-600";
  if (id === 800) return "from-sky-400 via-blue-500 to-indigo-600";
  if (id > 800) return "from-slate-500 via-blue-600 to-slate-700";
  return "from-sky-400 via-blue-500 to-indigo-600";
}
 
// Small History Icon
function HistoryWeatherIcon({ code }) {
  const props = { size: 16, strokeWidth: 1.8 };
  if (!code) return <Sun {...props} className="text-yellow-400" />;
  const id = parseInt(code);
  if (id >= 200 && id < 300) return <CloudLightning {...props} className="text-yellow-300" />;
  if (id >= 300 && id < 600) return <CloudRain {...props} className="text-blue-300" />;
  if (id >= 600 && id < 700) return <CloudSnow {...props} className="text-blue-100" />;
  if (id >= 700 && id < 800) return <CloudFog {...props} className="text-slate-300" />;
  if (id === 800) return <Sun {...props} className="text-yellow-400" />;
  return <Cloud {...props} className="text-slate-300" />;
}
 
//  Main Component
export default function WeatherApp() {
  const [query, setQuery] = useState("");
  const [weather, setWeather] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [animateCard, setAnimateCard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
 
  //  Fetch history from Back4App
  const fetchHistory = useCallback(async () => {
  try {
    const SearchHistory = Parse.Object.extend("SearchHistory");
    const q = new Parse.Query(SearchHistory);

    // Ordena oreder
    // refresh 
    q.descending("touchedAt");
    q.limit(5);

    const results = await q.find();
    setHistory(results.map((r) => ({
      id: r.id,
      city: r.get("city"),
      temp: r.get("temp"),
      condition: r.get("condition"),
      weatherCode: r.get("weatherCode"),
      country: r.get("country"),
      searchedAt: r.get("touchedAt"),
    })));
  } catch (err) {
    console.error("Erro ao buscar histórico:", err);
  }
}, []);
 
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);
 
  //Save to Back4App
  const saveToHistory = async (data) => {
  try {
    const SearchHistory = Parse.Object.extend("SearchHistory");
    const q = new Parse.Query(SearchHistory);

    // searche
    q.matches("city", new RegExp(`^${data.name}$`, "i"));

    const existing = await q.first();

    // Upsert
    const entry = existing ?? new SearchHistory();
    entry.set("city", data.name);
    entry.set("country", data.sys.country);
    entry.set("temp", Math.round(data.main.temp));
    entry.set("condition", data.weather[0].description);
    entry.set("weatherCode", String(data.weather[0].id));

    
    entry.set("touchedAt", new Date());

    await entry.save();
    await fetchHistory();
  } catch (err) {
    console.error("Erro ao salvar histórico:", err);
  }
};
 
  //Delete from Back4App
  const deleteFromHistory = async (id) => {
    setDeletingId(id);
    try {
      const SearchHistory = Parse.Object.extend("SearchHistory");
      const q = new Parse.Query(SearchHistory);
      const obj = await q.get(id);
      await obj.destroy();
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Erro ao deletar:", err);
    } finally {
      setDeletingId(null);
    }
  };
 
  // Fetch weather from OWM
  const handleSearch = async (cityName) => {
    const target = cityName || query.trim();
    if (!target) return;
 
    setLoading(true);
    setError(null);
    setAnimateCard(false);
 
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(target)}&appid=${OWM_API_KEY}&units=metric&lang=pt_br`
      );
 
      if (!res.ok) {
        if (res.status === 404) throw new Error("Cidade não encontrada. Verifique o nome e tente novamente.");
        throw new Error("Erro ao buscar dados do clima. Tente novamente.");
      }
 
      const data = await res.json();
      setWeather(data);
      await saveToHistory(data);
      setTimeout(() => setAnimateCard(true), 50);
    } catch (err) {
      setError(err.message);
      setWeather(null);
    } finally {
      setLoading(false);
    }
  };
 
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };
  
  const handleRefresh = async () => {
  if (!weather || refreshing) return;
  setRefreshing(true);
  await handleSearch(weather.name);
  setRefreshing(false);
};
 
  const gradient = weather ? getGradient(weather.weather[0].id) : "from-sky-400 via-blue-500 to-indigo-600";
 
  return (
    <main
      className={`min-h-screen bg-gradient-to-br ${gradient} transition-all duration-1000 flex flex-col items-center justify-start py-12 px-4`}
    >
      {/* ── Noise Texture Overlay ── */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
      />
 
      {/* ── Title ── */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg" style={{ fontFamily: "'Georgia', serif", letterSpacing: "-0.02em" }}>
          WeatherScope
        </h1>
        <p className="text-white/60 text-sm mt-1 font-light tracking-widest uppercase">Clima em tempo real</p>
      </div>
 
      {/* ── Search Bar ── */}
      <div className="w-full max-w-md mb-6">
        <div className="relative flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar cidade... (ex: São Paulo)"
            className="w-full bg-white/15 backdrop-blur-xl border border-white/25 text-white placeholder-white/40 rounded-2xl px-5 py-3.5 pr-12 text-sm font-medium outline-none focus:ring-2 focus:ring-white/40 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-12 text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={15} />
            </button>
          )}
          <button
            onClick={() => handleSearch()}
            disabled={loading}
            className="absolute right-3 text-white/70 hover:text-white transition-colors disabled:opacity-40"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Search size={20} />
            )}
          </button>
        </div>
      </div>
 
      {/* ── Error Message ── */}
      {error && (
        <div className="w-full max-w-md mb-5 flex items-start gap-3 bg-red-500/20 backdrop-blur-md border border-red-400/30 text-white rounded-2xl px-4 py-3 text-sm">
          <AlertCircle size={18} className="text-red-300 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
 
      {/* ── Weather Card ── */}
      {weather && (
        <div
          className={`w-full max-w-md mb-6 transition-all duration-700 ${animateCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-7 shadow-2xl">
            {/* Header */}
            
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium tracking-widest uppercase mb-1">
                  <MapPin size={12} />
                  <span>{weather.sys.country}</span>
                </div>
                <h2 className="text-3xl font-black text-white" style={{ fontFamily: "'Georgia', serif" }}>
                  {weather.name}
                </h2>
              </div>

              {/* add refresh button */}
              <div className="flex flex-col items-end gap-2">
                <div className="opacity-90">
                  {getWeatherIcon(weather.weather[0].id)}
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  title="Atualizar clima"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white/50 hover:text-white rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={13}
                    className={refreshing ? "animate-spin" : "transition-transform duration-300 hover:rotate-180"}
                  />
                  <span>{refreshing ? "Atualizando..." : "Atualizar"}</span>
                </button>
              </div>
            </div>
 
            {/* Temperature */}
            <div className="mb-6">
              <div className="flex items-end gap-2">
                <span className="text-8xl font-black text-white leading-none" style={{ fontFamily: "'Georgia', serif" }}>
                  {Math.round(weather.main.temp)}
                </span>
                <span className="text-3xl font-light text-white/60 mb-3">°C</span>
              </div>
              <p className="text-white/70 text-base capitalize mt-1 font-medium">
                {weather.weather[0].description}
              </p>
              <p className="text-white/40 text-sm mt-0.5">
                Sensação {Math.round(weather.main.feels_like)}°C · {getWeatherLabel(weather.weather[0].id)}
              </p>
            </div>
 
            {/* Divider */}
            <div className="border-t border-white/15 mb-5" />
 
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: <Droplets size={15} />, label: "Umidade", value: `${weather.main.humidity}%` },
                { icon: <Wind size={15} />, label: "Vento", value: `${Math.round(weather.wind.speed * 3.6)} km/h` },
                { icon: <Eye size={15} />, label: "Visib.", value: `${(weather.visibility / 1000).toFixed(1)} km` },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/10 rounded-2xl px-3 py-3 text-center">
                  <div className="flex justify-center text-white/50 mb-1">{stat.icon}</div>
                  <p className="text-white font-bold text-sm">{stat.value}</p>
                  <p className="text-white/40 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
 
      {/* ── Search History ── */}
      {history.length > 0 && (
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 text-white/50 text-xs font-medium tracking-widest uppercase mb-3 px-1">
            <Clock size={12} />
            <span>Últimas Buscas</span>
          </div>
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="group bg-white/10 backdrop-blur-xl border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between hover:bg-white/15 transition-all duration-200"
              >
                <button
                  className="flex items-center gap-3 flex-1 text-left"
                  onClick={() => {
                    setQuery(item.city);
                    handleSearch(item.city);
                  }}
                >
                  <div className="shrink-0">
                    <HistoryWeatherIcon code={item.weatherCode} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold leading-tight truncate">
                      {item.city}
                      {item.country && (
                        <span className="text-white/40 font-normal ml-1.5 text-xs">{item.country}</span>
                      )}
                    </p>
                    <p className="text-white/40 text-xs capitalize truncate">{item.condition}</p>
                  </div>
                </button>
 
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {item.temp != null && (
                    <span className="text-white/70 font-bold text-sm">{item.temp}°</span>
                  )}
                  <button
                    onClick={() => deleteFromHistory(item.id)}
                    disabled={deletingId === item.id}
                    className="text-white/20 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-40"
                  >
                    {deletingId === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
 
      {/* ── Empty State ── */}
      {!weather && !loading && !error && (
        <div className="mt-4 text-center text-white/30 text-sm">
          <Thermometer size={36} className="mx-auto mb-3 opacity-40" />
          <p>Digite o nome de uma cidade para começar.</p>
        </div>
      )}
    </main>
  );
}
 