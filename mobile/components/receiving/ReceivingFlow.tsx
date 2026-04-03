/**
 * ReceivingFlow — multi-step AI-first receiving.
 * Phase: INPUT → REVIEW → SUMMARY.
 * PO matching and full confirmation cards will be enhanced in later iterations.
 */
import { useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { PackageCheck, CheckCircle } from "lucide-react-native";
import { StepProgress } from "@/components/layout/StepProgress";
import { AIInput } from "@/components/ai/AIInput";
import { capturePhoto } from "@/components/ai/CameraCapture";
import { SupplierPicker } from "./SupplierPicker";
import { POBrowser } from "./POBrowser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useCreateReceipt,
  useParseReceivingText,
  useParseReceivingImage,
} from "@/hooks/use-receiving";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Supplier, PurchaseOrder } from "@/types/api";

type Phase = "INPUT" | "REVIEW" | "SUMMARY";

const STEPS = ["Input", "Review", "Confirm"];
const PHASE_INDEX: Record<Phase, number> = { INPUT: 0, REVIEW: 1, SUMMARY: 2 };

interface ParsedItem {
  productName: string;
  quantity: number;
  unitCost: number;
  unit: string;
  productId?: string;
}

export function ReceivingFlow() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("INPUT");
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [notes, setNotes] = useState("");

  const parseMutation = useParseReceivingText();
  const imageParseM = useParseReceivingImage();
  const createReceipt = useCreateReceipt();

  const handleSubmitText = useCallback(async () => {
    if (!text.trim()) return;
    try {
      const result = await parseMutation.mutateAsync(text.trim());
      const parsed = (result as { items?: ParsedItem[] })?.items ?? [];
      if (parsed.length > 0) {
        setItems(parsed);
        setPhase("REVIEW");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try describing the items differently.");
      }
    } catch {
      Alert.alert("Error", "Failed to parse input. Please try again.");
    }
  }, [text, parseMutation]);

  const handleCamera = useCallback(async () => {
    const uri = await capturePhoto();
    if (!uri) return;
    try {
      const result = await imageParseM.mutateAsync(uri);
      const parsed = (result as { items?: ParsedItem[] })?.items ?? [];
      if (parsed.length > 0) {
        setItems(parsed);
        setPhase("REVIEW");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try taking a clearer photo.");
      }
    } catch {
      Alert.alert("Error", "Failed to parse image.");
    }
  }, [imageParseM]);

  const handleConfirm = useCallback(async () => {
    if (!supplier || items.length === 0) return;
    try {
      await createReceipt.mutateAsync({
        supplierName: supplier.name,
        supplierId: supplier.id,
        notes: notes || undefined,
        lineItems: items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          unitCost: it.unitCost,
          unit: it.unit,
          productId: it.productId,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPhase("SUMMARY");
    } catch {
      Alert.alert("Error", "Failed to create receipt.");
    }
  }, [supplier, items, notes, createReceipt]);

  const handleReset = () => {
    setPhase("INPUT");
    setText("");
    setSupplier(null);
    setItems([]);
    setNotes("");
  };

  const handlePOSelect = useCallback((po: PurchaseOrder) => {
    setSupplier({ id: po.id, name: po.supplierName });
    setPhase("REVIEW");
  }, []);

  if (phase === "SUMMARY") {
    return (
      <View style={styles.summaryContainer}>
        <StepProgress steps={STEPS} currentStep={PHASE_INDEX[phase]} />
        <View style={styles.summaryIcon}>
          <CheckCircle size={48} color={colors.statusGreen} strokeWidth={1.5} />
        </View>
        <Text style={styles.summaryTitle}>Receipt Saved</Text>
        <Text style={styles.summaryMeta}>
          {items.length} item{items.length !== 1 ? "s" : ""} received from {supplier?.name}
        </Text>
        <Button title="Receive More" variant="primary" onPress={handleReset} />
      </View>
    );
  }

  if (phase === "REVIEW") {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <StepProgress steps={STEPS} currentStep={PHASE_INDEX[phase]} />
        <View style={{ height: spacing.lg }} />
        {/* Supplier picker */}
        <SupplierPicker
          selectedId={supplier?.id ?? ""}
          onSelect={setSupplier}
        />

        {/* Parsed items */}
        <Text style={styles.sectionTitle}>Items to Receive ({items.length})</Text>
        {items.map((item, i) => (
          <Card key={`${item.productName}-${i}`} style={styles.itemCard}>
            <Text style={styles.itemName}>{item.productName}</Text>
            <View style={styles.itemRow}>
              <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
              <Text style={styles.itemCost}>${item.unitCost.toFixed(2)} ea</Text>
            </View>
          </Card>
        ))}

        {/* Notes */}
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Delivery notes, PO reference\u2026"
          multiline
        />

        {/* Confirm */}
        <Button
          title={createReceipt.isPending ? "Saving\u2026" : "Confirm Receipt"}
          onPress={handleConfirm}
          disabled={!supplier || createReceipt.isPending}
          loading={createReceipt.isPending}
          size="lg"
          style={styles.confirmBtn}
        />

        <Button
          title="Back to Input"
          variant="ghost"
          onPress={() => setPhase("INPUT")}
          style={styles.backBtn}
        />
      </ScrollView>
    );
  }

  // INPUT phase
  return (
    <View style={styles.inputContainer}>
      <StepProgress steps={STEPS} currentStep={PHASE_INDEX[phase]} />
      <View style={styles.heroIcon}>
        <PackageCheck size={40} color={colors.brandBlue} strokeWidth={1.2} />
      </View>
      <Text style={styles.heroTitle}>Receive Material</Text>
      <Text style={styles.heroSub}>
        Take a photo of the packing slip, speak, or type what you received
      </Text>

      <AIInput
        value={text}
        onChangeText={setText}
        onSubmit={handleSubmitText}
        onMicPress={() => {/* Voice handled by parent in future */}}
        onCameraPress={handleCamera}
        isProcessing={parseMutation.isPending || imageParseM.isPending}
        placeholder="e.g. 50 sheets 3/4 plywood, 100 LF copper pipe\u2026"
      />

      {/* PO Browser — the primary receiving entry point */}
      <View style={styles.poBrowserWrap}>
        <POBrowser onSelect={handlePOSelect} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    paddingTop: spacing["3xl"],
    gap: spacing.lg,
  },
  poBrowserWrap: {
    width: "100%",
    marginTop: spacing.lg,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius["2xl"],
    backgroundColor: colors.statusBlueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    ...typography.sectionTitle,
    color: colors.navy,
  },
  heroSub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing["2xl"],
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.navy,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.sm,
  },
  itemName: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  itemQty: {
    ...typography.body,
    color: colors.textSecondary,
    fontVariant: ["tabular-nums"],
  },
  itemCost: {
    ...typography.body,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  confirmBtn: {
    marginTop: spacing["2xl"],
  },
  backBtn: {
    marginTop: spacing.sm,
  },
  summaryContainer: {
    alignItems: "center",
    paddingTop: spacing["4xl"],
    gap: spacing.lg,
  },
  summaryIcon: {
    marginBottom: spacing.sm,
  },
  summaryTitle: {
    ...typography.sectionTitle,
    color: colors.navy,
  },
  summaryMeta: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
});
