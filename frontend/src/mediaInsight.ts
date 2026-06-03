export type ExpertPrediction = {
  source: string;
  picks: number[];
};

export type MediaConsensus = {
  number: number;
  score: number;
  appearances: number;
};

export type MediaHorse = {
  number: number;
  name: string;
};

export type MediaInsightData = {
  experts: ExpertPrediction[];
  consensus: MediaConsensus[];
  horses: MediaHorse[];
};

export function buildMediaInsight(data: MediaInsightData) {
  const consensus = data.consensus.filter((c) => c.score > 0);
  const top = consensus[0];
  const second = consensus[1];
  const expertCount = data.experts.length;
  const topHorse = data.horses.find((h) => h.number === top?.number);
  const gap = (top?.score || 0) - (second?.score || 0);
  const agreement = expertCount ? (top?.appearances || 0) / expertCount : 0;
  const baseCounts = new Map<number, number>();

  data.experts.forEach((expert) => {
    const base = expert.picks[0];
    if (typeof base === "number") {
      baseCounts.set(base, (baseCounts.get(base) || 0) + 1);
    }
  });

  const uniqueBases = baseCounts.size;
  const outlier = [...baseCounts.entries()]
    .map(([number, count]) => ({
      number,
      count,
      consensusAppearances:
        consensus.find((entry) => entry.number === number)?.appearances || 0,
    }))
    .filter((entry) => entry.count === 1 && entry.consensusAppearances <= 2)
    .sort((a, b) => a.consensusAppearances - b.consensusAppearances)[0];

  const signals: string[] = [];
  if (!top || expertCount === 0) {
    signals.push("Donnees limitees");
  } else if (agreement >= 0.6 && gap >= 5) {
    signals.push("Accord fort");
  } else if (agreement >= 0.4) {
    signals.push("Accord modere");
  } else {
    signals.push("Avis partages");
  }
  if (uniqueBases >= 4) signals.push("Bases dispersees");
  if (outlier) signals.push("Outlier a noter");

  const title = topHorse
    ? `Lecture medias: ${top.number} - ${topHorse.name}`
    : "Lecture medias";
  const topPhrase = topHorse
    ? `Le ${top.number} (${topHorse.name}) concentre le plus de points et apparait chez ${top.appearances}/${expertCount} media(s).`
    : "Aucun signal media dominant ne ressort encore des pronostics disponibles.";
  const spreadPhrase =
    uniqueBases >= 4
      ? `Les bases sont dispersees entre ${uniqueBases} chevaux, ce qui indique une course moins tranchee.`
      : `Les bases sont relativement regroupees autour de ${uniqueBases || 0} cheval(aux).`;
  const outlierPhrase = outlier
    ? `Le ${outlier.number} apparait comme base isolee chez un media, a lire comme un point de divergence plutot qu'une recommandation.`
    : "Aucun outlier net ne ressort dans les bases des medias.";

  return {
    title,
    summary: `${topPhrase} L'ecart avec le suivant est de ${gap} point(s). ${spreadPhrase} ${outlierPhrase}`,
    signals: signals.slice(0, 3),
    agreementValue: top && expertCount ? `${top.appearances}/${expertCount}` : "-",
    gapValue: top ? `${gap} pts` : "-",
    baseValue: `${uniqueBases}`,
    outlierValue: outlier ? `${outlier.number}` : "-",
  };
}
