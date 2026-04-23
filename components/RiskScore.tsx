interface RiskScoreProps {
  score: number;
}

function getTone(score: number) {
  if (score >= 70) {
    return {
      label: "High",
      bar: "bg-orange-400",
      text: "text-orange-300"
    };
  }

  if (score >= 45) {
    return {
      label: "Medium",
      bar: "bg-amber-400",
      text: "text-amber-300"
    };
  }

  return {
    label: "Low",
    bar: "bg-emerald-400",
    text: "text-emerald-300"
  };
}

export function RiskScore({ score }: RiskScoreProps) {
  const tone = getTone(score);

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between">
        <span className={`text-sm font-semibold ${tone.text}`}>{tone.label} Risk</span>
        <span className="mono text-xs text-slate-300">{score}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
          style={{ width: `${Math.max(4, score)}%` }}
        />
      </div>
    </div>
  );
}
