/**
 * BomAIFlow — AI parsing flow for BOM creation from photo/text.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { AIInput } from "@/components/ai/AIInput";
import { ConfirmationCard } from "@/components/ai/ConfirmationCard";
import { capturePhoto } from "@/components/ai/CameraCapture";
import { LiveItemFeed } from "./LiveItemFeed";
import { useParseReceivingText } from "@/hooks/use-receiving";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface ParsedItem { productName: string; quantity: number; unit: string; productId?: string; confidence?: string; }

interface BomAIFlowProps {
  onItemsConfirmed: (items: ParsedItem[]) => void;
}

export function BomAIFlow({ onItemsConfirmed }: BomAIFlowProps) {
  const [text, setText] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [confirmed, setConfirmed] = useState<Set<number>>(new Set());
  const parseMutation = useParseReceivingText();

  const handleParse = useCallback(async () => {
    if (!text.trim()) return;
    try {
      const result = await parseMutation.mutateAsync(text.trim());
      const parsed = (result as any)?.items ?? [];
      setItems(parsed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch { Alert.alert("Error", "Failed to parse input"); }
  }, [text, parseMutation]);

  const handleCamera = useCallback(async () => {
    const uri = await capturePhoto();
    if (uri) Alert.alert("Photo captured", "Processing image\u2026");
  }, []);

  const handleConfirm = (index: number) => {
    const next = new Set(confirmed);
    next.add(index);
    setConfirmed(next);
    if (next.size === items.length) onItemsConfirmed(items);
  };

  const handleReject = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <AIInput
        value={text} onChangeText={setText} onSubmit={handleParse}
        onMicPress={() => {}} onCameraPress={handleCamera}
        isProcessing={parseMutation.isPending}
        placeholder="Describe materials or snap a photo\u2026"
      />
      {items.length > 0 && (
        <View style={styles.items}>
          <Text style={styles.title}>Parsed Items ({items.length})</Text>
          {items.map((item, i) => (
            <ConfirmationCard
              key={`${item.productName}-${i}`}
              productName={item.productName}
              confidence={item.confidence === "low" ? "low" : item.confidence === "medium" ? "medium" : "high"}
              quantity={item.quantity}
              unit={item.unit}
              onConfirm={() => handleConfirm(i)}
              onReject={() => handleReject(i)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  items: { gap: spacing.md },
  title: { ...typography.sectionTitle, color: colors.navy },
});
