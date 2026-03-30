import { useParams, Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

type LeaderboardRow = {
  team: string;
  score: number;
  submittedAt: string;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const Leaderboard = () => {
  const { hackathonId } = useParams();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hackathonName = hackathonId?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Hackathon";

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!hackathonId) return;

      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("submissions")
        .select("team_name, team_id, score, submitted_at, status")
        .eq("hackathon_slug", hackathonId)
        .in("status", ["evaluated", "queued"])
        .order("score", { ascending: false, nullsFirst: false })
        .order("submitted_at", { ascending: true });

      if (!mounted) return;

      if (fetchError) {
        setError(fetchError.message || "Failed to load leaderboard.");
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((row) => ({
        team: row.team_name?.trim() || row.team_id || "Unknown",
        score: Number(row.score || 0),
        submittedAt: row.submitted_at || "",
      }));

      setRows(mapped);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [hackathonId]);

  const leaderboardData = useMemo(
    () => rows.map((row, index) => ({ ...row, rank: index + 1 })),
    [rows],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="absolute inset-0 grid-bg opacity-20" />
      <div className="relative z-10 container mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">{hackathonName}</h1>
            <p className="text-sm text-muted-foreground">Leaderboard</p>
          </div>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Back
          </Link>
        </div>

        <div className="surface-elevated rounded-xl overflow-hidden">
          {loading && <p className="px-6 py-5 text-sm text-muted-foreground">Loading leaderboard...</p>}
          {!loading && error && <p className="px-6 py-5 text-sm text-destructive">{error}</p>}
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Rank</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Team</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Score</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !error && leaderboardData.map((row, i) => (
                <motion.tr
                  key={`${row.team}-${row.rank}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className={`border-b border-border/50 last:border-0 ${
                    row.rank === 1 ? "bg-gold/5" : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <span
                      className={`text-sm font-bold ${
                        row.rank === 1 ? "text-gold" : "text-muted-foreground"
                      }`}
                    >
                      #{row.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-semibold ${row.rank === 1 ? "text-gold" : "text-foreground"}`}>
                      {row.team}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-mono text-foreground">{row.score.toFixed(1)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-xs text-muted-foreground">{formatTime(row.submittedAt)}</span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
