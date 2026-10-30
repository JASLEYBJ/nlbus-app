import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/auth-context";
import { api } from "@/src/api";
import { colors, spacing, radius } from "@/src/theme";

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, isGuest, signOut } = useAuth();

  const favsQuery = useQuery({
    queryKey: ["favorites", user?.id ?? "guest"],
    queryFn: () => api.listFavorites(),
    enabled: !!user,
  });

  const linesQuery = useQuery({
    queryKey: ["lines-all"],
    queryFn: () => api.listLines(),
    enabled: !!user,
  });

  const favoriteLines = (favsQuery.data ?? [])
    .filter((f: any) => f.item_type === "line")
    .map((f: any) => (linesQuery.data ?? []).find((l: any) => l.id === f.item_id))
    .filter(Boolean);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 },
      ]}
      testID="profile-screen"
    >
      <Text style={styles.title}>Perfil</Text>

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name={user ? "person" : "person-outline"} size={28} color={colors.onBrandPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user?.name ?? (isGuest ? "Visitante" : "Convidado")}</Text>
          <Text style={styles.userEmail}>{user?.email ?? "Faça login para salvar favoritos"}</Text>
        </View>
        {!user ? (
          <Pressable
            onPress={() => router.push("/login")}
            style={styles.loginBtn}
            testID="profile-login-button"
          >
            <Text style={styles.loginBtnText}>Entrar</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionTitle title="Seus favoritos" />
      {!user ? (
        <View style={styles.locked} testID="favorites-locked">
          <Ionicons name="lock-closed-outline" size={28} color={colors.muted} />
          <Text style={styles.lockedText}>Entre para salvar linhas favoritas</Text>
        </View>
      ) : favsQuery.isLoading ? (
        <ActivityIndicator color={colors.brandPrimary} />
      ) : favoriteLines.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={28} color={colors.muted} />
          <Text style={styles.emptyText}>Nenhum favorito ainda</Text>
          <Text style={styles.emptyHint}>Toque no ❤️ em uma linha para salvar</Text>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {favoriteLines.map((l: any) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(`/line/${l.id}` as any)}
              style={styles.favRow}
              testID={`fav-line-${l.id}`}
            >
              <View style={[styles.lineBadge, { backgroundColor: l.color }]}>
                <Text style={styles.lineBadgeText}>{l.code}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.favName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.favSub} numberOfLines={1}>{l.origin} → {l.destination}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      <SectionTitle title="Preferências" />
      <View style={styles.list}>
        <Row icon="notifications-outline" label="Alertas de chegada" trailing="em breve" />
        <Row icon="language-outline" label="Idioma" trailing="Português (BR)" />
        <Row icon="moon-outline" label="Tema" trailing="Claro" />
      </View>

      <SectionTitle title="Sobre o NL BUS" />
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>Mobilidade urbana para Nova Lima</Text>
        <Text style={styles.aboutText}>
          O NL BUS é um projeto criado por Pedro Costa, Yago, Sarah e Ana para
          modernizar o transporte público de Nova Lima e região.
        </Text>
        <View style={styles.cityRow}>
          <CityPill label="Nova Lima" />
          <CityPill label="Belo Horizonte" />
          <CityPill label="Raposos" />
          <CityPill label="Rio Acima" />
          <CityPill label="Sabará" />
        </View>
      </View>

      {user ? (
        <Pressable
          onPress={signOut}
          style={styles.logout}
          testID="profile-logout-button"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.section}>{title}</Text>;
}

function Row({ icon, label, trailing }: { icon: any; label: string; trailing?: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.onSurfaceSecondary} />
      <Text style={styles.rowLabel}>{label}</Text>
      {trailing ? <Text style={styles.rowTrailing}>{trailing}</Text> : null}
    </View>
  );
}

function CityPill({ label }: { label: string }) {
  return (
    <View style={styles.cityPill}>
      <Text style={styles.cityPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceSecondary },
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.md },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  userCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.brandPrimary,
    alignItems: "center", justifyContent: "center",
  },
  userName: { fontSize: 16, fontWeight: "700", color: colors.onSurface },
  userEmail: { fontSize: 13, color: colors.muted, marginTop: 2 },
  loginBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.brandPrimary, borderRadius: radius.pill,
  },
  loginBtnText: { color: colors.onBrandPrimary, fontSize: 13, fontWeight: "700" },
  section: { fontSize: 14, fontWeight: "800", color: colors.onSurface, marginTop: spacing.md, textTransform: "uppercase", letterSpacing: 0.5 },
  locked: {
    alignItems: "center", padding: spacing.xl, gap: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed",
  },
  lockedText: { fontSize: 13, color: colors.muted },
  empty: { alignItems: "center", padding: spacing.xl, gap: 4, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  emptyText: { fontSize: 14, color: colors.onSurfaceSecondary, fontWeight: "600" },
  emptyHint: { fontSize: 12, color: colors.muted },
  favRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  lineBadge: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  lineBadgeText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  favName: { fontSize: 14, fontWeight: "700", color: colors.onSurface },
  favSub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider,
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.onSurface, fontWeight: "500" },
  rowTrailing: { fontSize: 12, color: colors.muted },
  aboutCard: {
    padding: spacing.lg, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm,
  },
  aboutTitle: { fontSize: 15, fontWeight: "700", color: colors.onSurface },
  aboutText: { fontSize: 13, color: colors.onSurfaceSecondary, lineHeight: 19 },
  cityRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  cityPill: { backgroundColor: colors.brandTertiary, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  cityPillText: { fontSize: 11, color: colors.onBrandTertiary, fontWeight: "700" },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    marginTop: spacing.lg, height: 50, backgroundColor: colors.surface,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  logoutText: { color: colors.error, fontSize: 14, fontWeight: "700" },
});
