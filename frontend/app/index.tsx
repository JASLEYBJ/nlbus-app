import { Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "@/src/auth-context";
import { colors } from "@/src/theme";

export default function Index() {
  const { user, loading, isGuest } = useAuth();

  if (loading) {
    return (
      <View style={styles.center} testID="loading-root">
        <ActivityIndicator color={colors.brandPrimary} size="large" />
      </View>
    );
  }

  if (user || isGuest) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
