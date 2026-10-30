import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useAuth } from "@/src/auth-context";
import { colors, spacing, radius } from "@/src/theme";

export default function Register() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email || !password) {
      setError("Preencha e-mail e senha");
      return;
    }
    if (password.length < 6) {
      setError("A senha deve ter ao menos 6 caracteres");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await signUp(email.trim(), password, name.trim() || undefined);
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e?.message ?? "Falha ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10} testID="register-back-button">
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>

        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="bus" size={28} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>Favorite rotas e receba alertas de chegada</Text>
        </View>

        <View style={styles.form}>
          <Field
            icon="person-outline"
            placeholder="Nome (opcional)"
            value={name}
            onChangeText={setName}
            testID="register-name-input"
          />
          <Field
            icon="mail-outline"
            placeholder="E-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="register-email-input"
          />
          <Field
            icon="lock-closed-outline"
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="register-password-input"
          />
          {error ? (
            <Text style={styles.error} testID="register-error">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={loading}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed, loading && styles.btnDisabled]}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.btnText}>Criar conta</Text>
            )}
          </Pressable>

          <View style={styles.row}>
            <Text style={styles.rowText}>Já tem conta?</Text>
            <Link href="/login" asChild>
              <Pressable testID="register-go-login">
                <Text style={styles.link}>Entrar</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: any) {
  const { icon, ...rest } = props;
  return (
    <View style={styles.field}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: spacing.xl, flexGrow: 1 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  header: { marginTop: spacing.xl, marginBottom: spacing.xl2, gap: spacing.md },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.onSurface, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.muted },
  form: { gap: spacing.md },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    height: 54,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.onSurface },
  btn: {
    marginTop: spacing.md,
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: { opacity: 0.9 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.onBrandPrimary, fontSize: 16, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, textAlign: "center" },
  row: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
  },
  rowText: { color: colors.muted, fontSize: 14 },
  link: { color: colors.brandPrimary, fontWeight: "700", fontSize: 14 },
});
