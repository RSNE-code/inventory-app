/**
 * ApprovalCard — approve or reject an assembly with notes.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, TextInput, Alert } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Check, X } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUpdateAssembly } from "@/hooks/use-assemblies";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface ApprovalCardProps {
  assemblyId: string;
  onApproved?: () => void;
  onRejected?: () => void;
}

export function ApprovalCard({ assemblyId, onApproved, onRejected }: ApprovalCardProps) {
  const isTablet = useIsTablet();
  const updateMutation = useUpdateAssembly();
  const [notes, setNotes] = useState("");

  const minButtonHeight = isTablet ? 48 : 44;

  const handleApprove = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        id: assemblyId,
        status: "APPROVED",
        specs: notes ? { approvalNotes: notes } : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onApproved?.();
    } catch {
      Alert.alert("Error", "Failed to approve assembly");
    }
  }, [assemblyId, notes, updateMutation, onApproved]);

  const handleReject = useCallback(async () => {
    if (!notes.trim()) {
      Alert.alert("Notes Required", "Please add a reason for rejection.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: assemblyId,
        status: "PLANNED",
        specs: { rejectionNotes: notes.trim() },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onRejected?.();
    } catch {
      Alert.alert("Error", "Failed to reject assembly");
    }
  }, [assemblyId, notes, updateMutation, onRejected]);

  return (
    <Animated.View entering={FadeInDown.springify().damping(20)}>
      <Card accent="yellow">
        <Text style={styles.title}>Approval Required</Text>
        <Text style={styles.description}>
          Review this assembly and approve or reject it.
        </Text>

        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes (required for rejection)…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={styles.actions}>
          <Button
            title="Approve"
            icon={<Check size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleApprove}
            loading={updateMutation.isPending}
            style={{ minHeight: minButtonHeight, flex: 1 }}
          />
          <Button
            title="Reject"
            variant="destructive"
            icon={<X size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleReject}
            loading={updateMutation.isPending}
            style={{ minHeight: minButtonHeight, flex: 1 }}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.cardTitle,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  notesInput: {
    ...typography.body,
    color: colors.navy,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 80,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
  },
});
