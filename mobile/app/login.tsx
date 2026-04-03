/**
 * Login screen — RSNE branded, navy gradient, centered card.
 * Matches web's login/page.tsx layout and feel.
 */
import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/lib/auth";
import { colors } from "@/constants/colors";
import { type as typography, FONT_FAMILY } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrandLg } from "@/constants/shadows";
import { CARD_ENTER_DELAY } from "@/constants/animations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSignIn = async () => {
    setError("");
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    if (err) {
      setError("Invalid email or password");
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.navy, colors.navyLight]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Login card */}
        <Animated.View
          entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15).stiffness(150)}
          style={styles.card}
        >
          {/* Logo */}
          <Animated.View
            entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify()}
            style={styles.logoPill}
          >
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Brand accent line */}
          <Animated.View
            entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify()}
            style={styles.accentLine}
          />

          <Animated.Text
            entering={FadeInDown.delay(CARD_ENTER_DELAY * 4).springify()}
            style={styles.subtitle}
          >
            Sign in to manage inventory
          </Animated.Text>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@rsofne.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />

            {error !== "" ? (
              <Animated.View
                entering={FadeInDown.springify().damping(15)}
                style={styles.errorBox}
              >
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            <Button
              title={loading ? "Signing in\u2026" : "Sign In"}
              onPress={handleSignIn}
              loading={loading}
              disabled={!email || !password}
              size="lg"
            />

            <Pressable
              onPress={() => setShowForgot(!showForgot)}
              style={styles.forgotButton}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {showForgot ? (
              <Animated.View
                entering={FadeInDown.springify().damping(15)}
                style={styles.forgotHint}
              >
                <Text style={styles.forgotHintText}>
                  Contact your administrator to reset your password.
                </Text>
              </Animated.View>
            ) : null}
          </View>
        </Animated.View>

        {/* App name */}
        <Animated.Text
          entering={FadeInDown.delay(CARD_ENTER_DELAY * 6).springify()}
          style={styles.appName}
        >
          Shop Bot by RSNE
        </Animated.Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius["2xl"],
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["3xl"],
    alignItems: "center",
    ...shadowBrandLg,
  },
  logoPill: {
    borderRadius: radius.xl,
    overflow: "hidden",
    marginBottom: spacing.xl,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: radius.xl,
  },
  accentLine: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.brandBlue,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: spacing["2xl"],
  },
  form: {
    width: "100%",
    gap: spacing.xl,
  },
  errorBox: {
    backgroundColor: colors.statusRedBg,
    borderWidth: 1,
    borderColor: colors.errorBorder,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.statusRed,
    textAlign: "center",
    fontWeight: "500",
  },
  forgotButton: {
    alignSelf: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  forgotText: {
    ...typography.body,
    color: colors.textMuted,
  },
  forgotHint: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  forgotHintText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
  appName: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.4)",
    marginTop: spacing["2xl"],
    letterSpacing: 1,
  },
});
