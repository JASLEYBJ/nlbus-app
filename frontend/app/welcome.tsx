import { router } from "expo-router";
import { StyleSheet, Text, View, Pressable, ImageBackground } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

const HERO = "https://images.unsplash.com/photo-1632276536839-84cad7fd03b0?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { continueAsGuest } = useAuth();

  return (
    <View style={styles.root} testID="welcome-screen">
      <ImageBackground source={{ uri: HERO }} style={styles.hero} resizeMode="cover">
        <LinearGradient
          colors={["rgba(2,132,199,0.1)", "rgba(15,23,42,0.3)", "rgba(15,23,42,0.95)"]}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>Mobilidade Urbana</Text>
          </View>
        </View>
      </ImageBackground>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Text style={styles.brand} testID="app-brand">NL BUS</Text>
        <Text style={styles.subtitle}>
          Todas as linhas de ônibus de Nova Lima e região na palma da sua mão.
        </Text>

        <View style={styles.features}>
          <Feature icon="map-outline" label="Rotas & pontos" />
          <Feature icon="time-outline" label="Horários em tempo real" />
          <Feature icon="heart-outline" label="Favoritos & alertas" />
        </View>

        <Pressable
          testID="welcome-login-button"
          onPress={() => router.push("/login")}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.primaryBtnText}>Entrar</Text>
        </Pressable>

        <Pressable
          testID="welcome-register-button"
          onPress={() => router.push("/register")}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryBtnText}>Criar conta</Text>
        </Pressable>

        <Pressable
          testID="welcome-guest-button"
          onPress={() => {
            continueAsGuest();
            router.replace("/(tabs)");
          }}
          style={styles.guestBtn}
          hitSlop={8}
        >
          <Text style={styles.guestText}>Continuar como visitante</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.brandTertiary} />
        </Pressable>
      </View>
    </View>
  );
}

function Feature({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.brandSecondary} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceInverse },
  hero: { height: "48%", justifyContent: "flex-start" },
  heroContent: { paddingHorizontal: spacing.xl },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    gap: spacing.sm,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary },
  badgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  bottom: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.md,
    justifyContent: "flex-end",
  },
  brand: { color: "#FFFFFF", fontSize: 44, fontWeight: "800", letterSpacing: -1 },
  subtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  features: { gap: spacing.sm, marginBottom: spacing.lg },
  featureItem: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(16,185,129,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureLabel: { color: "#FFFFFF", fontSize: 15, fontWeight: "500" },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  primaryBtnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 15,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  guestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  guestText: { color: colors.brandTertiary, fontSize: 14, fontWeight: "500" },
  pressed: { opacity: 0.85 },
});
