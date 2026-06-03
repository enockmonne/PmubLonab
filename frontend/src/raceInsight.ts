export type RaceInsightData = {
  race: {
    name: string;
    runners: number;
  };
  consensus: ConsensusPick[];
  horses: HorseSummary[];
  predictions_count: number;
};

export type ConsensusPick = {
  number: number;
  score: number;
  appearances: number;
};

export type HorseSummary = {
  number: number;
  name: string;
  perf?: string;
  consensus_score?: number;
  consensus_appearances?: number;
};

export function buildRaceInsight(data: RaceInsightData) {
  const consensus = data.consensus || [];
  const horses = data.horses || [];
  const top = consensus[0];
  const second = consensus[1];
  const topHorse = horses.find((h) => h.number === top?.number);
  const totalSources = data.predictions_count || 0;
  const topMentions = top?.appearances || 0;
  const consensusGap = (top?.score || 0) - (second?.score || 0);
  const coverageRate = totalSources ? topMentions / totalSources : 0;
  const formProfiles = horses
    .map((horse) => ({
      horse,
      top3: countRecentTop3(horse.perf),
    }))
    .filter((entry) => entry.top3 > 0)
    .sort((a, b) => b.top3 - a.top3);
  const bestForm = formProfiles[0];

  const signals: string[] = [];
  if (!top || totalSources === 0) {
    signals.push("Donnees limitees");
  } else if (coverageRate >= 0.6 && consensusGap >= 5) {
    signals.push("Consensus fort");
  } else if (coverageRate >= 0.4) {
    signals.push("Consensus modere");
  } else {
    signals.push("Course ouverte");
  }
  if (bestForm && bestForm.top3 >= 3) signals.push("Profil regulier");
  if (data.race.runners >= 14) signals.push("Peloton fourni");
  if (signals.length === 0) signals.push("A surveiller");

  const title = topHorse
    ? `Signal principal: ${top.number} - ${topHorse.name}`
    : "Lecture rapide";
  const consensusPhrase = topHorse
    ? `Le ${top.number} (${topHorse.name}) ressort le plus dans les pronostics disponibles, cite par ${topMentions}/${totalSources || "?"} media(s).`
    : "Les pronostics disponibles ne donnent pas encore un signal de consensus exploitable.";
  const fieldPhrase =
    coverageRate >= 0.6 && consensusGap >= 5
      ? "Le consensus est relativement concentre."
      : "La lecture reste ouverte et merite d'etre croisee avec la forme recente.";
  const formPhrase = bestForm
    ? `Cote regularite, le ${bestForm.horse.number} (${bestForm.horse.name}) affiche ${bestForm.top3} place(s) dans le top 3 sur ses dernieres indications de forme.`
    : "La forme recente ne fait pas encore ressortir un profil clairement regulier.";

  return {
    title,
    summary: `${consensusPhrase} ${fieldPhrase} ${formPhrase}`,
    signals: signals.slice(0, 3),
    consensusValue: top ? `${top.number}` : "-",
    mediaValue: totalSources ? `${topMentions}/${totalSources}` : "-",
    formValue: bestForm ? `${bestForm.horse.number}` : "-",
    dataValue: `${horses.length}/${data.race.runners || horses.length}`,
  };
}

function countRecentTop3(perf?: string) {
  if (!perf) return 0;
  return perf
    .split(/[^0-9]+/)
    .map((part) => Number(part))
    .filter((n) => Number.isFinite(n) && n > 0)
    .slice(0, 5)
    .filter((n) => n <= 3).length;
}
