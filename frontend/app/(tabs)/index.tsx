import { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import { NOVA_LIMA_CENTER } from "@/src/constants";
import MapView, { Marker, PROVIDER_DEFAULT } from "@/src/map";

export default function HomeMap() {
  const insets = useSafeAreaInsets();
  const [center] = useState({ lat: NOVA_LIMA_CENTER.latitude, lng: NOVA_LIMA_CENTER.longitude });

  const stopsQuery = useQuery({
    queryKey: ["nearby-stops", center.lat, center.lng],
    queryFn: () => api.nearbyStops(center.lat, center.lng, 15),
  });

  const linesQuery = useQuery({ queryKey: ["lines"], queryFn: () => api.listLines() });

  const stops = stopsQuery.data ?? [];
  const lines = linesQuery.data ?? [];

  return (
    <View style={styles.root} testID="home-map-screen">
      {Platform.OS !== "web" ? (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFillObject}
          initialRegion={NOVA_LIMA_CENTER}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {stops.map((s: any) => (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={s.name}
              description={s.address}
              onCalloutPress={() => router.push(`/stop/${s.id}` as any)}
            >
              <View style={styles.marker}>
                <Ionicons name="bus" size={14} color={colors.onBrandPrimary} />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <WebMapFallback stops={stops} />
      )}

      {/* Floating search header */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <BlurView intensity={70} tint="light" style={styles.searchGlass}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <Pressable style={styles.searchPress} onPress={() => router.push("/(tabs)/lines")}>
            <Text style={styles.searchText} testID="search-cta">Para onde você vai?</Text>
          </Pressable>
          <View style={styles.locPill}>
            <Ionicons name="location" size={12} color={colors.brandSecondary} />
            <Text style={styles.locText}>Nova Lima</Text>
          </View>
        </BlurView>
      </View>

      {/* Bottom sheet-like container */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 80 }]}>
        <View style={styles.handle} />
        <Text style={styles.sheetTitle}>Pontos próximos</Text>
        <Text style={styles.sheetSub}>Nova Lima e região</Text>

        {stopsQuery.isLoading ? (
          <ActivityIndicator color={colors.brandPrimary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            testID="nearby-stops-list"
          >
            {stops.slice(0, 8).map((s: any) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/stop/${s.id}` as any)}
                style={styles.stopCard}
                testID={`stop-card-${s.id}`}
              >
                <View style={styles.stopIcon}>
                  <Ionicons name="location-sharp" size={16} color={colors.brandPrimary} />
                </View>
                <Text numberOfLines={1} style={styles.stopName}>{s.name}</Text>
                <Text numberOfLines={1} style={styles.stopMeta}>
                  {s.distance_km != null ? `${s.distance_km} km` : s.address}
                </Text>
                <View style={styles.stopLinesRow}>
                  {(s.lines ?? []).slice(0, 3).map((l: any) => (
                    <View key={l.line_id} style={[styles.linePill, { backgroundColor: l.color }]}>
                      <Text style={styles.linePillText}>{l.code}</Text>
                    </View>
                  ))}
                  {(s.lines?.length ?? 0) > 3 ? (
                    <Text style={styles.moreLines}>+{s.lines.length - 3}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.row}>
          <Text style={styles.sheetTitle}>Linhas populares</Text>
          <Pressable onPress={() => router.push("/(tabs)/lines")} testID="see-all-lines">
            <Text style={styles.linkText}>Ver todas</Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hList}
        >
          {lines.slice(0, 6).map((l: any) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/line/${l.id}` as any)}
              style={styles.lineCard}
              testID={`line-card-${l.id}`}
            >
              <View style={[styles.lineCode, { backgroundColor: l.color }]}>
                <Text style={styles.lineCodeText}>{l.code}</Text>
              </View>
              <Text numberOfLines={1} style={styles.lineTitle}>{l.name}</Text>
              <View style={styles.inlineRow}>
                <Ionicons name="time-outline" size={13} color={colors.muted} />
                <Text style={styles.lineMeta}>{l.duration_min} min</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.lineMeta}>R$ {l.fare.toFixed(2).replace(".", ",")}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.liveBanner} testID="live-tracking-banner">
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Localização em tempo real</Text>
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>em breve</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function WebMapFallback({ stops }: { stops: any[] }) {
  return (
    <View style={styles.webFallback}>
      <View style={styles.webGrid}>
        {stops.map((s) => (
          <View key={s.id} style={styles.webDot}>
            <Ionicons name="bus" size={10} color={colors.onBrandPrimary} />
          </View>
        ))}
      </View>
      <Text style={styles.webHint}>Pré-visualização do mapa. Em dispositivos móveis, o mapa real é exibido.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
  },
  searchGlass: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: Platform.OS === "web" ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  searchPress: { flex: 1 },
  searchText: { fontSize: 15, color: colors.muted, fontWeight: "500" },
  locPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.pill,
  },
  locText: { fontSize: 11, color: colors.onBrandTertiary, fontWeight: "700" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
    maxHeight: "58%",
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceTertiary,
    marginBottom: spacing.sm,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  sheetSub: { fontSize: 13, color: colors.muted, marginTop: -spacing.sm },
  hList: { gap: spacing.md, paddingVertical: spacing.sm, paddingRight: spacing.md },
  stopCard: {
    width: 180,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  stopMeta: { fontSize: 12, color: colors.muted },
  stopLinesRow: { flexDirection: "row", gap: 4, marginTop: 4, alignItems: "center" },
  linePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  linePillText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  moreLines: { fontSize: 11, color: colors.muted, fontWeight: "700" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  linkText: { color: colors.brandPrimary, fontWeight: "700", fontSize: 13 },
  lineCard: {
    width: 200,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineCode: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lineCodeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  lineTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  lineMeta: { fontSize: 12, color: colors.muted },
  dot: { color: colors.muted, fontSize: 11 },
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary },
  liveText: { flex: 1, fontSize: 13, color: colors.onBrandTertiary, fontWeight: "600" },
  soonPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
  },
  soonText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  webFallback: {
    flex: 1,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  webGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    justifyContent: "center",
    maxWidth: 400,
  },
  webDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  webHint: { marginTop: spacing.lg, fontSize: 12, color: colors.muted, textAlign: "center" },
});
