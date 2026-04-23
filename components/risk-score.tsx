interface RiskScoreProps {
  score: number;
}

function levelForScore(score: number) {
  if (score >= 85) {
    return {
      label: "Critical",
      className: "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50"
    };
  }

  if (score >= 70) {
    return {
      label: "High",
      className: "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50"
    };
  }

  if (score >= 45) {
    return {
      label: "Moderate",
      className: "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
    };
  }

  return {
    label: "Low",
    className: "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
  };
}

export function RiskScore({ score }: RiskScoreProps) {
  const risk = levelForScore(score);

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`}>
      <span>{risk.label}</span>
      <span>{score}%</span>
    </div>
  );
}
