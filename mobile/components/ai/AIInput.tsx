/**
 * AIInput — text input bar with voice mic button and camera button.
 * Matches web's ai-input.tsx: text field + mic toggle + camera.
 */
import { useState } from "react";
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Mic, MicOff, Camera, Send } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrand } from "@/constants/shadows";

interface AIInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onMicPress: () => void;
  onCameraPress: () => void;
  isListening?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
}

export function AIInput({
  value,
  onChangeText,
  onSubmit,
  onMicPress,
  onCameraPress,
  isListening = false,
  isProcessing = false,
  placeholder = "Type or speak what you received\u2026",
}: AIInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, focused && styles.containerFocused]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        multiline
        returnKeyType="send"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        editable={!isProcessing}
      />

      <View style={styles.actions}>
        {/* Camera button */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCameraPress();
          }}
          style={styles.iconButton}
          accessibilityLabel="Take photo"
        >
          <Camera size={20} color={colors.textMuted} strokeWidth={1.8} />
        </Pressable>

        {/* Mic button — simple toggle per CLAUDE.md rules */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onMicPress();
          }}
          style={[styles.iconButton, isListening && styles.micActive]}
          accessibilityLabel={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <MicOff size={20} color={colors.textInverse} strokeWidth={1.8} />
          ) : (
            <Mic size={20} color={colors.brandOrange} strokeWidth={1.8} />
          )}
        </Pressable>

        {/* Send button */}
        {value.trim().length > 0 && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSubmit();
            }}
            style={styles.sendButton}
            accessibilityLabel="Send"
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Send size={18} color={colors.textInverse} strokeWidth={2} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius["2xl"],
    borderWidth: 1,
    borderColor: "transparent",
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadowBrand,
  },
  containerFocused: {
    backgroundColor: colors.background,
    borderColor: colors.brandBlue,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    minHeight: 40,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  micActive: {
    backgroundColor: colors.brandOrange,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
  },
});
