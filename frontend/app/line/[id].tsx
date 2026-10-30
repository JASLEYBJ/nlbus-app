import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Ionicons from "@react-native-vector-icons/ionicons";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "@/src/map";

export default function LineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showRating, setShowRating] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const detail = useQuery({ queryKey: ["line", id], queryFn: () => api.lineDetail(id!), enabled: !!id });
  const favs = useQuery({ queryKey: ["favorites", user?.id ?? "guest"], queryFn: () => api.listFavorites(), enabled: !!user });
  const ratings = useQuery({ queryKey: ["ratings", id], queryFn: () => api.getRatings(id!), enabled: !!id });

  const isFav = useMemo(
    () => (favs.data ?? []).some((f: any) => f.item_type === "line" && f.item_id === id),
    [favs.data, id],
  );

  const toggleFav = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    Haptics.notificationAsync(isFav ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success);
    if (isFav) await api.removeFavorite("line", id!);
    else await api.addFavorite("line", id!);
    qc.invalidateQueries({ queryKey: ["favorites"] });
  };

  const submitRating = async () => {
    try {
      await api.rateLine(id!, stars, comment || undefined);
      setShowRating(false);
      setComment("");
      setStars(5);
      ratings.refetch();
    } catch {}
  };

  if (detail.isLoading || !detail.data) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  const line = detail.data;
  const coords = (line.stops ?? []).map((s: any) => ({ latitude: s.lat, longitude: s.lng }));
  const midLat = coords.length ? coords.reduce((a: number, b: any) => a + b.latitude, 0) / coords.length : -19.98;
  const midLng = coords.length ? coords.reduce((a: number, b: any) => a + b.longitude, 0) / coords.length : -43.85;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm, backgroundColor: line.color }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10} testID="line-back-button">
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerCode}>Linha {line.code}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{line.name}</Text>
        </View>
        <Pressable onPress={toggleFav} style={styles.iconBtn} hitSlop={10} testID="line-fav-button">
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {Platform.OS !== "web" ? (
          <MapView
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={{ latitude: midLat, longitude: midLng, latitudeDelta: 0.3, longitudeDelta: 0.3 }}
          >
            {coords.length > 1 && (
              <Polyline coordinates={coords} strokeColor={line.color} strokeWidth={4} />
            )}
            {line.stops.map((s: any, idx: number) => (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.lat, longitude: s.lng }}
                title={s.name}
              >
                <View style={[styles.stopMarker, { borderColor: line.color }]}>
                  <Text style={[styles.stopMarkerText, { color: line.color }]}>{idx + 1}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={[styles.map, styles.webMap]}>
            <Text style={styles.webMapText}>Mapa visível em dispositivos móveis</Text>
          </View>
        )}

        <View style={styles.metrics}>
          <Metric icon="time-outline" value={`${line.duration_min}`} label="minutos" />
          <View style={styles.vSep} />
          <Metric icon="cash-outline" value={`R$ ${line.fare.toFixed(2).replace(".", ",")}`} label="tarifa" />
          <View style={styles.vSep} />
          <Metric
            icon="star"
            value={line.rating_avg ? line.rating_avg.toFixed(1) : "–"}
            label={`${line.rating_count ?? 0} avaliações`}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trajeto</Text>
          <Text style={styles.sectionSub}>
            {line.operating_days === "weekdays" ? "Seg a Sex" : line.operating_days === "weekends" ? "Fins de semana" : "Todos os dias"}
          </Text>
        </View>

        <View style={styles.timeline}>
          {line.stops.map((s: any, idx: number) => {
            const last = idx === line.stops.length - 1;
            return (
              <View key={s.id} style={styles.tlRow}>
                <View style={styles.tlCol}>
                  <View style={[styles.tlDot, { borderColor: line.color, backgroundColor: colors.surface }]} />
                  {!last && <View style={[styles.tlLine, { backgroundColor: line.color }]} />}
                </View>
                <Pressable
                  style={styles.tlCard}
                  onPress={() => router.push(`/stop/${s.id}` as any)}
                  testID={`timeline-stop-${s.id}`}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tlName}>{s.name}</Text>
                    <Text style={styles.tlAddr} numberOfLines={1}>{s.address}</Text>
                  </View>
                  {s.next_arrival ? (
                    <View style={styles.tlArrival}>
                      <Text style={styles.tlArrivalIn}>em {s.next_arrival.in_min} min</Text>
                      <Text style={styles.tlArrivalTime}>{s.next_arrival.arrival}</Text>
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Horários de partida</Text>
        </View>
        <View style={styles.scheduleGrid}>
          {line.schedule.map((t: string) => (
            <View key={t} style={styles.timeChip}>
              <Text style={styles.timeChipText}>{t}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ratingBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ratingTitle}>Como foi sua viagem?</Text>
            <Text style={styles.ratingSub}>Avalie para ajudar outros passageiros</Text>
          </View>
          <Pressable
            onPress={() => setShowRating(true)}
            style={styles.ratingBtn}
            testID="rate-line-button"
          >
            <Ionicons name="star" size={14} color={colors.onBrandSecondary} />
            <Text style={styles.ratingBtnText}>Avaliar</Text>
          </Pressable>
        </View>

        <View style={styles.liveBanner}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Localização do veículo em tempo real</Text>
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>em breve</Text>
          </View>
        </View>
      </ScrollView>

      {showRating ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.ratingOverlay}
        >
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowRating(false)} />
          <View style={[styles.ratingSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.pickerHandle} />
            <Text style={styles.ratingSheetTitle}>Avaliar linha {line.code}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setStars(n)} hitSlop={6} testID={`star-${n}`}>
                  <Ionicons
                    name={n <= stars ? "star" : "star-outline"}
                    size={34}
                    color={colors.warning}
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Comentário (opcional)"
              placeholderTextColor={colors.muted}
              multiline
              style={styles.commentInput}
              testID="rating-comment"
            />
            <Pressable onPress={submitRating} style={styles.cta} testID="rating-submit">
              <Text style={styles.ctaText}>Enviar avaliação</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

function Metric({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={16} color={colors.brandPrimary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  loadingRoot: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  headerCode: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
  headerName: { color: "#FFFFFF", fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  map: { width: "100%", height: 220, backgroundColor: colors.surfaceTertiary },
  webMap: { alignItems: "center", justifyContent: "center" },
  webMapText: { color: colors.muted, fontSize: 13 },
  stopMarker: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: "#FFFFFF", borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  stopMarkerText: { fontSize: 11, fontWeight: "800" },
  metrics: {
    flexDirection: "row", alignItems: "center",
    padding: spacing.md, marginHorizontal: spacing.lg, marginTop: -spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricValue: { fontSize: 16, fontWeight: "800", color: colors.onSurface },
  metricLabel: { fontSize: 10, color: colors.muted, textTransform: "uppercase", fontWeight: "600", letterSpacing: 0.3 },
  vSep: { width: 1, height: 36, backgroundColor: colors.border },
  section: { paddingHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.3 },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  timeline: { paddingHorizontal: spacing.lg, gap: 0 },
  tlRow: { flexDirection: "row", gap: spacing.md },
  tlCol: { alignItems: "center", width: 20 },
  tlDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 3, marginTop: 10 },
  tlLine: { flex: 1, width: 2, marginVertical: 2 },
  tlCard: {
    flex: 1, flexDirection: "row", alignItems: "center",
    padding: spacing.md, marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  tlName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  tlAddr: { fontSize: 11, color: colors.muted, marginTop: 2 },
  tlArrival: { alignItems: "flex-end" },
  tlArrivalIn: { fontSize: 11, color: colors.brandSecondary, fontWeight: "700" },
  tlArrivalTime: { fontSize: 14, fontWeight: "800", color: colors.onSurface },
  scheduleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: spacing.lg },
  timeChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.brandTertiary, borderRadius: radius.sm,
  },
  timeChipText: { fontSize: 13, fontWeight: "700", color: colors.onBrandTertiary },
  ratingBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    marginHorizontal: spacing.lg, marginTop: spacing.xl, padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
  },
  ratingTitle: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  ratingSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  ratingBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.brandSecondary, borderRadius: radius.pill,
  },
  ratingBtnText: { color: colors.onBrandSecondary, fontSize: 13, fontWeight: "700" },
  liveBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md,
    backgroundColor: colors.brandTertiary, borderRadius: radius.md,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary },
  liveText: { flex: 1, fontSize: 12, color: colors.onBrandTertiary, fontWeight: "600" },
  soonPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, backgroundColor: colors.brandPrimary, borderRadius: radius.pill },
  soonText: { color: colors.onBrandPrimary, fontSize: 10, fontWeight: "800" },
  ratingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end",
  },
  ratingSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md,
  },
  pickerHandle: { alignSelf: "center", width: 42, height: 4, borderRadius: 2, backgroundColor: colors.surfaceTertiary, marginBottom: spacing.sm },
  ratingSheetTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, textAlign: "center" },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  commentInput: {
    minHeight: 80, padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    fontSize: 14, color: colors.onSurface, textAlignVertical: "top",
  },
  cta: {
    height: 50, backgroundColor: colors.brandPrimary, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  ctaText: { color: colors.onBrandPrimary, fontSize: 15, fontWeight: "700" },
});
