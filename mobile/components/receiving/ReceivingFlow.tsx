/**
 * ReceivingFlow — multi-step AI-first receiving.
 * Phase: INPUT → REVIEW → SUMMARY.
 * PO matching and full confirmation cards will be enhanced in later iterations.
 */
import { useState, useCallback, useRef, useMemo } from "react";
import { StyleSheet, ScrollView, View, Text, Alert, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { PackageCheck, CheckCircle, Camera, ClipboardList } from "lucide-react-native";
import { StepProgress } from "@/components/layout/StepProgress";
import { AIInput } from "@/components/ai/AIInput";
import { capturePhoto } from "@/components/ai/CameraCapture";
import { SupplierPicker } from "./SupplierPicker";
import { POBrowser } from "./POBrowser";
import { POMatchCard } from "./POMatchCard";
import { POReceiveCard } from "./POReceiveCard";
import { PanelBreakout } from "./PanelBreakout";
import { ReceivingConfirmationCard } from "./ReceivingConfirmationCard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  useCreateReceipt,
  useParseReceivingText,
  useParseReceivingImage,
} from "@/hooks/use-receiving";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Supplier, PurchaseOrder } from "@/types/api";

type Phase = "INPUT" | "PO_MATCH" | "PO_RECEIVE" | "REVIEW" | "SUMMARY";

const STEPS = ["Input", "Review", "Confirm"];
const PHASE_INDEX: Record<Phase, number> = { INPUT: 0, PO_MATCH: 1, PO_RECEIVE: 1, REVIEW: 1, SUMMARY: 2 };

interface ParsedItem {
  productName: string;
  quantity: number;
  unitCost: number;
  unit: string;
  productId?: string;
}

interface ReceivingFlowProps {
  scrollViewRef?: React.RefObject<ScrollView | null>;
}

export function ReceivingFlow({ scrollViewRef }: ReceivingFlowProps) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const poBrowserRef = useRef<View>(null);
  const [phase, setPhase] = useState<Phase>("INPUT");
  const [text, setText] = useState("");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [matchedPO, setMatchedPO] = useState<PurchaseOrder | null>(null);
  const [confirmedItemIds, setConfirmedItemIds] = useState<Set<number>>(new Set());

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

  const handleBrowsePOs = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollViewRef?.current?.scrollToEnd({ animated: true });
  }, [scrollViewRef]);

  const handlePOSelect = useCallback((po: PurchaseOrder) => {
    setMatchedPO(po);
    setSupplier({ id: po.id, name: po.supplierName });
    setPhase("PO_MATCH");
  }, []);

  const handlePOAccept = useCallback(() => {
    if (!matchedPO) return;
    setPhase("PO_RECEIVE");
  }, [matchedPO]);

  const handlePOReject = useCallback(() => {
    setMatchedPO(null);
    setPhase("INPUT");
  }, []);

  // PO Match phase — show matched PO with accept/reject
  if (phase === "PO_MATCH" && matchedPO) {
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <StepProgress steps={STEPS} currentStep={PHASE_INDEX[phase]} />
        <View style={{ height: spacing.lg }} />
        <POMatchCard
          poNumber={matchedPO.poNumber}
          supplierName={matchedPO.supplierName}
          confidence={0.85}
          onAccept={handlePOAccept}
          onReject={handlePOReject}
        />
        <Button
          title="Back to Input"
          variant="ghost"
          onPress={handlePOReject}
          style={styles.backBtn}
        />
      </ScrollView>
    );
  }

  // PO Receive phase — show PO line items for receiving
  if (phase === "PO_RECEIVE" && matchedPO) {
    const poLineItems = ((matchedPO as any).lineItems ?? []).map((li: any) => ({
      id: String(li.id ?? ""),
      productName: String(li.productName ?? ""),
      qtyOrdered: Number(li.quantity ?? 0),
      qtyReceived: Number(li.qtyReceived ?? 0),
    }));

    return (
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <StepProgress steps={STEPS} currentStep={PHASE_INDEX[phase]} />
        <View style={{ height: spacing.lg }} />
        <POReceiveCard poNumber={matchedPO.poNumber} lineItems={poLineItems} />

        {/* Panel breakout — renders when PO has panel line items */}
        {((matchedPO as any).panelBreakout) ? (
          <View style={{ marginTop: spacing.lg }}>
            <PanelBreakout
              brand={String((matchedPO as any).panelBreakout.brand ?? "")}
              thickness={String((matchedPO as any).panelBreakout.thickness ?? "")}
              panels={(matchedPO as any).panelBreakout.panels ?? []}
            />
          </View>
        ) : null}

        <View style={{ height: spacing.lg }} />
        <SupplierPicker selectedId={supplier?.id ?? ""} onSelect={setSupplier} />
        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Delivery notes…"
          multiline
        />
        <Button
          title={createReceipt.isPending ? "Saving…" : "Confirm Receipt"}
          onPress={handleConfirm}
          disabled={!supplier || createReceipt.isPending}
          loading={createReceipt.isPending}
          size="lg"
          style={styles.confirmBtn}
        />
        <Button
          title="Back"
          variant="ghost"
          onPress={() => setPhase("PO_MATCH")}
          style={styles.backBtn}
        />
      </ScrollView>
    );
  }

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

        {/* Parsed items with confirm/reject */}
        <Text style={styles.sectionTitle}>Items to Receive ({items.length})</Text>
        {items.map((item, i) => (
          <ReceivingConfirmationCard
            key={`${item.productName}-${i}`}
            productName={item.productName}
            quantity={item.quantity}
            unitCost={item.unitCost}
            unit={item.unit}
            isConfirmed={confirmedItemIds.has(i)}
            onConfirm={() => setConfirmedItemIds((prev) => new Set(prev).add(i))}
            onReject={() => {
              setItems((prev) => prev.filter((_, idx) => idx !== i));
              setConfirmedItemIds((prev) => {
                const next = new Set(prev);
                next.delete(i);
                return next;
              });
            }}
          />
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

      {/* Prominent entry cards — side-by-side on iPad */}
      <View style={isTablet ? styles.entryRow : styles.entryCol}>
        <Pressable
          onPress={handleCamera}
          style={[styles.entryCard, styles.entryCardOrange, isTablet && styles.entryHalf]}
        >
          <View style={styles.entryIconOrange}>
            <Camera size={32} color={colors.textInverse} strokeWidth={1.8} />
          </View>
          <Text style={styles.entryTitle}>Packing Slip</Text>
          <Text style={styles.entrySub}>
            Take a photo of your packing slip
          </Text>
        </Pressable>

        <Pressable
          onPress={handleBrowsePOs}
          style={[styles.entryCard, styles.entryCardBlue, isTablet && styles.entryHalf]}
        >
          <View style={styles.entryIconBlue}>
            <ClipboardList size={32} color={colors.textInverse} strokeWidth={1.8} />
          </View>
          <Text style={styles.entryTitle}>Browse POs</Text>
          <Text style={styles.entrySub}>
            Select a purchase order to receive against
          </Text>
        </Pressable>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or type / speak below</Text>
        <View style={styles.dividerLine} />
      </View>

      <AIInput
        value={text}
        onChangeText={setText}
        onSubmit={handleSubmitText}
        onMicPress={() => {/* Voice handled by parent in future */}}
        onCameraPress={handleCamera}
        isProcessing={parseMutation.isPending || imageParseM.isPending}
        placeholder="e.g. 50 sheets 3/4 plywood, 100 LF copper pipe\u2026"
      />

      {/* PO Browser */}
      <View ref={poBrowserRef} style={styles.poBrowserWrap}>
        <POBrowser onSelect={handlePOSelect} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  entryRow: {
    flexDirection: "row",
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  entryCol: {
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  entryHalf: {
    flex: 1,
  },
  entryCard: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 160,
  },
  entryCardOrange: {
    borderLeftWidth: 4,
    borderLeftColor: colors.brandOrange,
  },
  entryCardBlue: {
    borderLeftWidth: 4,
    borderLeftColor: colors.brandBlue,
  },
  entryIconOrange: {
    width: 64,
    height: 64,
    borderRadius: radius["2xl"],
    backgroundColor: colors.brandOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  entryIconBlue: {
    width: 64,
    height: 64,
    borderRadius: radius["2xl"],
    backgroundColor: colors.brandBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  entryTitle: {
    ...typography.sectionTitle,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  entrySub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  poBrowserWrap: {
    width: "100%",
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
