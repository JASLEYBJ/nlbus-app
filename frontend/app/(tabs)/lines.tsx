import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "nl", label: "Nova Lima" },
  { key: "bh", label: "Belo Horizonte" },
  { key: "raposos", label: "Raposos" },
  { key: "sabara", label: "Sabará" },
  { key: "rioacima", label: "Rio Acima" },
];

export default function LinesScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const linesQuery = useQuery({
    queryKey: ["lines", query],
    queryFn: () => api.listLines(query || undefined),
  });

  const filtered = useMemo(() => {
    const items = linesQuery.data ?? [];
    const map: Record<string, (l: any) => boolean> = {
      all: () => true,
      nl: (l) => /nova lima|canadá|honório|alphaville|cristais|retiro|centro/i.test(`${l.name} ${l.destination} ${l.origin}`) && !/bh|savassi|raposos|sabará|rio acima/i.test(`${l.name}`),
      bh: (l) => /bh|savassi|belo horizonte/i.test(`${l.name} ${l.destination}`),
      raposos: (l) => /raposos/i.test(`${l.name} ${l.destination}`),
      sabara: (l) => /sabará/i.test(`${l.name} ${l.destination}`),
      rioacima: (l) => /rio acima/i.test(`${l.name} ${l.destination}`),
    };
    return items.filter(map[filter] ?? (() => true));
  }, [linesQuery.data, filter]);

  return (
    <View style={styles.root} testID="lines-screen">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Linhas de ônibus</Text>
        <Text style={styles.sub}>Descubra todas as rotas disponíveis</Text>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por número, destino..."
            placeholderTextColor={colors.muted}
            style={styles.input}
            testID="lines-search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={styles.chipsRowOuter}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`filter-${f.key}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {linesQuery.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl2 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search" size={32} color={colors.muted} />
              <Text style={styles.emptyText}>Nenhuma linha encontrada</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/line/${item.id}` as any)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
              testID={`line-row-${item.id}`}
            >
              <View style={[styles.lineBadge, { backgroundColor: item.color }]}>
                <Text style={styles.lineBadgeText}>{item.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.inlineRow}>
                  <Ionicons name="location-outline" size={13} color={colors.muted} />
                  <Text style={styles.lineRoute} numberOfLines={1}>
                    {item.origin} → {item.destination}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.muted} />
                    <Text style={styles.metaText}>{item.duration_min} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="cash-outline" size={12} color={colors.muted} />
                    <Text style={styles.metaText}>R$ {item.fare.toFixed(2).replace(".", ",")}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                    <Text style={styles.metaText}>
                      {item.operating_days === "weekdays" ? "Seg a Sex" : item.operating_days === "weekends" ? "Fins de semana" : "Todos os dias"}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.muted },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  input: { flex: 1, fontSize: 15, color: colors.onSurface },
  chipsRowOuter: { marginHorizontal: -spacing.lg, marginTop: spacing.xs },
  chipsRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: spacing.lg,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  chipActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontSize: 13, color: colors.onSurfaceSecondary, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandPrimary },
  list: { padding: spacing.lg, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  lineBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  lineBadgeText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  lineName: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  lineRoute: { fontSize: 12, color: colors.muted, flex: 1 },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.muted, fontWeight: "500" },
  empty: { alignItems: "center", padding: spacing.xl2, gap: spacing.sm },
  emptyText: { color: colors.muted, fontSize: 14 },
});
