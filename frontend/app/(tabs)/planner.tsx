import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import * as Haptics from "expo-haptics";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

type Suggestion = { label: string; lat: number; lng: number };

const SUGGESTIONS: Suggestion[] = [
  { label: "Terminal Rodoviário NL (Centro)", lat: -19.9872, lng: -43.8486 },
  { label: "Praça Bernardino Monteiro", lat: -19.9856, lng: -43.8471 },
  { label: "Jardim Canadá", lat: -20.0532, lng: -43.9712 },
  { label: "Honório Bicalho", lat: -19.9985, lng: -43.8102 },
  { label: "Alphaville", lat: -19.9684, lng: -43.9389 },
  { label: "Vale do Sereno", lat: -19.9719, lng: -43.9321 },
  { label: "BH - Savassi", lat: -19.9387, lng: -43.9343 },
  { label: "BH - Praça Sete", lat: -19.9208, lng: -43.9376 },
  { label: "Raposos Centro", lat: -19.9696, lng: -43.8023 },
  { label: "Rio Acima", lat: -20.0896, lng: -43.7845 },
  { label: "Sabará Centro", lat: -19.8878, lng: -43.8023 },
];

export default function Planner() {
  const insets = useSafeAreaInsets();
  const [origin, setOrigin] = useState<Suggestion | null>(null);
  const [dest, setDest] = useState<Suggestion | null>(null);
  const [picking, setPicking] = useState<null | "origin" | "dest">(null);
  const [options, setOptions] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    if (!origin || !dest) {
      setError("Selecione origem e destino");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.plan(origin.lat, origin.lng, dest.lat, dest.lng);
      setOptions(res.options);
      if (res.options.length === 0) setError("Nenhuma rota direta encontrada entre esses pontos");
    } catch (e: any) {
      setError(e?.message ?? "Erro ao planejar rota");
    } finally {
      setLoading(false);
    }
  };

  const swap = () => {
    Haptics.selectionAsync();
    setOrigin(dest);
    setDest(origin);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        testID="planner-screen"
      >
        <Text style={styles.title}>Planejar viagem</Text>
        <Text style={styles.sub}>Encontre o melhor caminho de ônibus</Text>

        <View style={styles.card}>
          <View style={styles.pathColumn}>
            <View style={styles.dotOrigin} />
            <View style={styles.pathLine} />
            <View style={styles.dotDest} />
          </View>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Pressable
              style={styles.fieldBtn}
              onPress={() => setPicking("origin")}
              testID="planner-origin-button"
            >
              <Text style={styles.fieldLabel}>De</Text>
              <Text style={[styles.fieldValue, !origin && styles.fieldPlaceholder]}>
                {origin?.label ?? "Selecionar origem"}
              </Text>
            </Pressable>
            <View style={styles.separator} />
            <Pressable
              style={styles.fieldBtn}
              onPress={() => setPicking("dest")}
              testID="planner-dest-button"
            >
              <Text style={styles.fieldLabel}>Para</Text>
              <Text style={[styles.fieldValue, !dest && styles.fieldPlaceholder]}>
                {dest?.label ?? "Selecionar destino"}
              </Text>
            </Pressable>
          </View>
          <Pressable style={styles.swap} onPress={swap} hitSlop={8} testID="planner-swap">
            <Ionicons name="swap-vertical" size={18} color={colors.brandPrimary} />
          </Pressable>
        </View>

        <Pressable
          onPress={search}
          disabled={loading}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }, loading && { opacity: 0.6 }]}
          testID="planner-search-button"
        >
          {loading ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <>
              <Ionicons name="navigate" size={18} color={colors.onBrandPrimary} />
              <Text style={styles.ctaText}>Buscar rotas</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {options && options.length > 0 ? (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>{options.length} opções encontradas</Text>
            <View style={styles.sortedPill}>
              <Ionicons name="flash" size={11} color={colors.onBrandSecondary} />
              <Text style={styles.sortedText}>mais rápidas primeiro</Text>
            </View>
          </View>
        ) : null}

        {options?.map((o, idx) => (
          <Pressable
            key={`${o.line_id}-${idx}`}
            onPress={() => router.push(`/line/${o.line_id}` as any)}
            style={styles.optCard}
            testID={`plan-option-${idx}`}
          >
            <View style={styles.optTop}>
              <View style={[styles.lineBadge, { backgroundColor: o.line_color }]}>
                <Text style={styles.lineBadgeText}>{o.line_code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLine}>{o.line_name}</Text>
                <Text style={styles.optFare}>R$ {o.fare.toFixed(2).replace(".", ",")}</Text>
              </View>
              <View style={styles.timeBig}>
                <Text style={styles.timeNum}>{o.total_min}</Text>
                <Text style={styles.timeUnit}>min</Text>
              </View>
            </View>
            <View style={styles.steps}>
              <Step icon="walk" value={`${o.walk_to_board_min} min`} label="caminhar" />
              <Ionicons name="chevron-forward" size={12} color={colors.muted} />
              <Step icon="bus" value={`${o.bus_time_min} min`} label={o.board_stop.name} active />
              <Ionicons name="chevron-forward" size={12} color={colors.muted} />
              <Step icon="walk" value={`${o.walk_to_dest_min} min`} label="caminhar" />
            </View>
            {o.next_departure ? (
              <View style={styles.nextDep}>
                <Ionicons name="time" size={12} color={colors.brandSecondary} />
                <Text style={styles.nextDepText}>
                  Próxima partida {o.next_departure.departure} • chega às {o.next_departure.arrival}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      {picking ? (
        <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setPicking(null)} />
          <View style={[styles.picker, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.pickerHandle} />
            <Text style={styles.pickerTitle}>
              {picking === "origin" ? "Selecione a origem" : "Selecione o destino"}
            </Text>
            <ScrollView style={{ maxHeight: 420 }}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => {
                    if (picking === "origin") setOrigin(s);
                    else setDest(s);
                    setPicking(null);
                  }}
                  style={styles.pickerItem}
                  testID={`suggestion-${s.label}`}
                >
                  <Ionicons name="location" size={18} color={colors.brandPrimary} />
                  <Text style={styles.pickerText}>{s.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Step({ icon, value, label, active }: { icon: any; value: string; label: string; active?: boolean }) {
  return (
    <View style={styles.stepItem}>
      <Ionicons name={icon} size={14} color={active ? colors.brandPrimary : colors.muted} />
      <View>
        <Text style={[styles.stepValue, active && { color: colors.brandPrimary }]}>{value}</Text>
        <Text style={styles.stepLabel} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.muted, marginTop: -spacing.sm, marginBottom: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  pathColumn: { alignItems: "center", width: 16, height: 88 },
  dotOrigin: { width: 12, height: 12, borderRadius: 6, borderWidth: 3, borderColor: colors.brandPrimary, backgroundColor: colors.surface },
  pathLine: { flex: 1, width: 2, backgroundColor: colors.brandPrimary, marginVertical: 2 },
  dotDest: { width: 12, height: 12, borderRadius: 2, backgroundColor: colors.brandSecondary },
  fieldBtn: { paddingVertical: spacing.sm, gap: 2 },
  fieldLabel: { fontSize: 11, color: colors.muted, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { fontSize: 15, color: colors.onSurface, fontWeight: "600" },
  fieldPlaceholder: { color: colors.muted, fontWeight: "500" },
  separator: { height: 1, backgroundColor: colors.border },
  swap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    alignItems: "center", justifyContent: "center",
  },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    height: 54, backgroundColor: colors.brandPrimary, borderRadius: radius.md, marginTop: spacing.sm,
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, textAlign: "center", marginTop: spacing.sm },
  resultsHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  resultsTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  sortedPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.brandSecondary, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  sortedText: { color: colors.onBrandSecondary, fontSize: 10, fontWeight: "700" },
  optCard: {
    padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  optTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  lineBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  lineBadgeText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  optLine: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  optFare: { fontSize: 12, color: colors.muted, marginTop: 2 },
  timeBig: { alignItems: "center" },
  timeNum: { fontSize: 22, fontWeight: "800", color: colors.brandPrimary, letterSpacing: -0.5 },
  timeUnit: { fontSize: 10, color: colors.muted, fontWeight: "700", textTransform: "uppercase" },
  steps: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  stepItem: { flexDirection: "row", alignItems: "center", gap: 6, maxWidth: 120 },
  stepValue: { fontSize: 12, fontWeight: "700", color: colors.onSurface },
  stepLabel: { fontSize: 10, color: colors.muted },
  nextDep: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.brandTertiary, padding: spacing.sm, borderRadius: radius.sm,
  },
  nextDepText: { fontSize: 12, color: colors.onBrandTertiary, fontWeight: "600" },
  pickerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "flex-end",
  },
  picker: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  pickerHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.surfaceTertiary, marginBottom: spacing.md },
  pickerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, marginBottom: spacing.md },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  pickerText: { fontSize: 15, color: colors.onSurface, fontWeight: "500" },
});
