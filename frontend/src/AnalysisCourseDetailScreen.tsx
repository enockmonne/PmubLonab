import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchJson } from "./apiClient";
import { API_URL, formatFCFA, theme } from "./theme";

type RaceDocument = {
  race_id: string;
  doc_type: "programme" | "result";
  name: string;
  date_text?: string;
  date_iso?: string;
  location?: string;
  meeting_label?: string;
  race_type?: string;
  discipline?: string;
  distance_m?: number;
  runners?: number;
  horses?: { number: number; name: string; jockey?: string; trainer?: string }[];
  linked_programme_ids?: string[];
  linked_result_ids?: string[];
  previous_results?: {
    finishing_order?: number[];
    npo?: number[];
    fallers_dq?: number[];
    payouts?: { type?: string; amount_fcfa?: number; label?: string }[];
  };
  parse_quality?: { warnings?: string[] };
};

export default function AnalysisCourseDetailScreen() {
  const { race_id } = useLocalSearchParams<{ race_id: string }>();
  const router = useRouter();
  const [programme, setProgramme] = useState<RaceDocument | null>(null);
  const [result, setResult] = useState<RaceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const primary = await fetchJson<RaceDocument>(`${API_URL}/api/races/${race_id}`, { timeoutMs: 12000 });
        let nextProgramme = primary.doc_type === "programme" ? primary : null;
        let nextResult = primary.doc_type === "result" ? primary : null;
        const linkedId =
          primary.doc_type === "programme"
            ? primary.linked_result_ids?.[0]
            : primary.linked_programme_ids?.[0];
        if (linkedId) {
          const linked = await fetchJson<RaceDocument>(`${API_URL}/api/races/${linkedId}`, { timeoutMs: 12000 });
          if (linked.doc_type === "programme") nextProgramme = linked;
          else nextResult = linked;
        }
        if (active) {
          setProgramme(nextProgramme);
          setResult(nextResult);
        }
      } catch (error) {
        console.error(error);
        if (active) setNotice("Impossible de charger ce dossier de course.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [race_id]);

  const primary = programme || result;
  const official = result?.previous_results;
  const warnings = useMemo(
    () => [
      ...(programme?.parse_quality?.warnings || []).map((text) => ({ source: "Programme", text })),
      ...(result?.parse_quality?.warnings || []).map((text) => ({ source: "Résultat", text })),
    ],
    [programme, result],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.nav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={21} color={theme.colors.brand} />
          <Text style={styles.backText}>Courses</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={theme.colors.brand} />
      ) : !primary ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Dossier indisponible</Text>
          <Text style={styles.body}>{notice || "Cette course est introuvable."}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} testID="analysis-course-detail">
          <Text style={styles.overline}>Dossier historique</Text>
          <Text style={styles.title}>{programme?.name || result?.name}</Text>
          <Text style={styles.lead}>
            {[primary.date_text || primary.date_iso, primary.meeting_label || primary.location]
              .filter(Boolean)
              .join(" • ")}
          </Text>

          <View style={styles.metrics}>
            <Metric label="Type" value={primary.race_type || primary.discipline || "Non renseigné"} />
            <Metric label="Distance" value={primary.distance_m ? `${primary.distance_m} m` : "Non renseignée"} />
            <Metric label="Partants" value={programme?.runners ? `${programme.runners}` : "Non renseignés"} />
            <Metric label="Couverture" value={programme && result ? "Programme + résultat" : programme ? "Programme seul" : "Résultat seul"} />
          </View>

          <Section title="Documents et provenance">
            {programme ? <DocumentRow label="Programme" document={programme} /> : <Missing text="Programme non disponible" />}
            {result ? <DocumentRow label="Résultat officiel" document={result} /> : <Missing text="Résultat officiel non lié" />}
          </Section>

          <Section title="Arrivée officielle" source="Résultat PDF">
            {official?.finishing_order?.length ? (
              <>
                <View style={styles.arrivalRow}>
                  {official.finishing_order.slice(0, 5).map((number, index) => (
                    <View key={`${number}-${index}`} style={styles.arrivalCell}>
                      <Text style={styles.place}>{index === 0 ? "1er" : `${index + 1}e`}</Text>
                      <Text style={styles.number}>{number}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.detailLine}>Non-partants : {official.npo?.length ? official.npo.join(" - ") : "Aucun indiqué"}</Text>
                {official.fallers_dq?.length ? <Text style={styles.detailLine}>Tombés / disqualifiés : {official.fallers_dq.join(" - ")}</Text> : null}
              </>
            ) : <Missing text="Aucune arrivée officielle disponible" />}
          </Section>

          <Section title="Rapports officiels" source="Résultat PDF">
            {official?.payouts?.length ? official.payouts.map((payout, index) => (
              <View key={`${payout.type}-${index}`} style={styles.payoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutType}>{payout.type || "Rapport"}</Text>
                  {payout.label ? <Text style={styles.small}>{payout.label}</Text> : null}
                </View>
                <Text style={styles.payoutValue}>{payout.amount_fcfa ? formatFCFA(payout.amount_fcfa) : "—"}</Text>
              </View>
            )) : <Missing text="Aucun rapport officiel disponible" />}
          </Section>

          <Section title={`Partants (${programme?.horses?.length || 0})`} source="Programme PDF">
            {programme?.horses?.length ? programme.horses.map((horse) => (
              <View key={horse.number} style={styles.horseRow}>
                <View style={styles.horseNumber}><Text style={styles.horseNumberText}>{horse.number}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.horseName}>{horse.name}</Text>
                  <Text style={styles.small}>{[horse.jockey, horse.trainer].filter(Boolean).join(" • ") || "Informations limitées"}</Text>
                </View>
              </View>
            )) : <Missing text="Aucun partant extrait du programme" />}
          </Section>

          <Section title="Qualité d’extraction">
            {warnings.length ? warnings.map((warning, index) => (
              <View key={`${warning.source}-${index}`} style={styles.warning}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.gold} />
                <Text style={styles.warningText}><Text style={{ fontWeight: "900" }}>{warning.source} :</Text> {warning.text}</Text>
              </View>
            )) : <Text style={styles.body}>Aucun point de contrôle signalé par l’extraction.</Text>}
            <Text style={styles.caveat}>Les champs absents décrivent la couverture des PDF importés et ne préjugent pas du résultat d’une course.</Text>
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, source, children }: { title: string; source?: string; children: React.ReactNode }) {
  return <View style={styles.section}><View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{source ? <Text style={styles.source}>{source}</Text> : null}</View>{children}</View>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue}>{value}</Text></View>;
}
function DocumentRow({ label, document }: { label: string; document: RaceDocument }) {
  return <View style={styles.document}><Text style={styles.documentLabel}>{label}</Text><Text style={styles.documentName}>{document.name}</Text><Text style={styles.documentId}>{document.race_id}</Text></View>;
}
function Missing({ text }: { text: string }) { return <Text style={styles.missing}>{text}</Text>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.bg },
  nav: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  back: { flexDirection: "row", alignItems: "center" },
  backText: { fontSize: 14, color: theme.colors.brand, fontWeight: "700" },
  content: { padding: 16, paddingBottom: 48 },
  overline: { fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: theme.colors.gold, fontWeight: "800" },
  title: { fontFamily: theme.fonts.serifBlack, fontSize: 29, lineHeight: 34, color: theme.colors.textPrimary, marginTop: 5 },
  lead: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary, marginTop: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: theme.colors.border, marginTop: 18, backgroundColor: theme.colors.surface },
  metric: { width: "50%", minHeight: 76, padding: 12, borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border },
  metricLabel: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.2, color: theme.colors.gold, fontWeight: "800" },
  metricValue: { fontSize: 14, lineHeight: 18, color: theme.colors.textPrimary, fontWeight: "800", marginTop: 5 },
  section: { marginTop: 18, padding: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 11 },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: "900", color: theme.colors.textPrimary },
  source: { fontSize: 9, color: theme.colors.gold, fontWeight: "800", textTransform: "uppercase" },
  document: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  documentLabel: { fontSize: 10, color: theme.colors.brand, fontWeight: "900", textTransform: "uppercase" },
  documentName: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: "700", marginTop: 3 },
  documentId: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 3 },
  arrivalRow: { flexDirection: "row", gap: 5 },
  arrivalCell: { flex: 1, alignItems: "center", paddingVertical: 9, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt },
  place: { fontSize: 9, color: theme.colors.textSecondary, fontWeight: "800" },
  number: { fontSize: 18, color: theme.colors.textPrimary, fontWeight: "900", marginTop: 2 },
  detailLine: { fontSize: 12, color: theme.colors.textPrimary, marginTop: 10 },
  payoutRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  payoutType: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: "700" },
  payoutValue: { fontSize: 13, color: theme.colors.brand, fontWeight: "900" },
  horseRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  horseNumber: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.brand },
  horseNumberText: { color: "#fff", fontSize: 12, fontWeight: "900" },
  horseName: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: "800" },
  small: { fontSize: 10, color: theme.colors.textSecondary, marginTop: 2 },
  warning: { flexDirection: "row", alignItems: "flex-start", gap: 7, marginBottom: 8 },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17, color: theme.colors.textSecondary },
  caveat: { fontSize: 11, lineHeight: 16, color: theme.colors.textSecondary, fontStyle: "italic", marginTop: 8 },
  missing: { fontSize: 12, color: theme.colors.textSecondary, fontStyle: "italic", paddingVertical: 8 },
  body: { fontSize: 13, lineHeight: 19, color: theme.colors.textSecondary },
  empty: { padding: 32, alignItems: "center" },
  emptyTitle: { fontSize: 18, color: theme.colors.textPrimary, fontWeight: "900", marginBottom: 6 },
});
