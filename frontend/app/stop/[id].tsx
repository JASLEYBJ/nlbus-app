import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";
import MapView, { Marker, PROVIDER_DEFAULT } from "@/src/map";

export default function StopDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const detail = useQuery({ queryKey: ["stop", id], queryFn: () => api.stopDetail(id!), enabled: !!id });

  if (detail.isLoading || !detail.data) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  const stop = detail.data;
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10} testID="stop-back-button">
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerCode}>Ponto de ônibus</Text>
          <Text style={styles.headerName} numberOfLines={1}>{stop.name}</Text>
        </View>
      </View>

      {Platform.OS !== "web" ? (
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{ latitude: stop.lat, longitude: stop.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        >
          <Marker coordinate={{ latitude: stop.lat, longitude: stop.lng }} title={stop.name}>
            <View style={styles.marker}>
              <Ionicons name="bus" size={14} color={colors.onBrandPrimary} />
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={[styles.map, { alignItems: "center", justifyContent: "center" }]}>
          <Text style={{ color: colors.muted }}>Mapa visível em dispositivos móveis</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.addrCard}>
          <Ionicons name="location-outline" size={18} color={colors.brandPrimary} />
          <Text style={styles.addrText}>{stop.address}</Text>
        </View>

        <Text style={styles.sectionTitle}>Linhas que passam aqui</Text>
        <Text style={styles.sectionSub}>{stop.lines?.length ?? 0} linhas disponíveis</Text>

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          {(stop.lines ?? []).map((l: any) => (
            <Pressable
              key={l.line_id}
              onPress={() => router.push(`/line/${l.line_id}` as any)}
              style={styles.lineRow}
              testID={`stop-line-${l.line_id}`}
            >
              <View style={[styles.lineBadge, { backgroundColor: l.color }]}>
                <Text style={styles.lineBadgeText}>{l.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.lineDest} numberOfLines={1}>→ {l.destination}</Text>
              </View>
              {l.next_arrival ? (
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.arrIn}>em {l.next_arrival.in_min} min</Text>
                  <Text style={styles.arrTime}>{l.next_arrival.arrival}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingRoot: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center", justifyContent: "center",
  },
  headerCode: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase" },
  headerName: { color: colors.onSurface, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  map: { width: "100%", height: 220, backgroundColor: colors.surfaceTertiary },
  marker: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#FFFFFF",
  },
  addrCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.brandTertiary,
    borderRadius: radius.md, marginBottom: spacing.lg,
  },
  addrText: { flex: 1, fontSize: 13, color: colors.onBrandTertiary, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  lineRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  lineBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  lineBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  lineName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  lineDest: { fontSize: 12, color: colors.muted, marginTop: 2 },
  arrIn: { fontSize: 11, color: colors.brandSecondary, fontWeight: "700" },
  arrTime: { fontSize: 14, fontWeight: "800", color: colors.onSurface, marginTop: 2 },
});
