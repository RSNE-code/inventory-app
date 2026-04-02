/**
 * LiveItemFeed — real-time feed of items being added to BOM.
 */
import { StyleSheet, View, Text } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Check, Package } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";

interface FeedItem { productName: string; quantity: number; unit: string; }

interface LiveItemFeedProps { items: FeedItem[]; }

export function LiveItemFeed({ items }: LiveItemFeedProps) {
  if (items.length === 0) return null;
  return (
    <View style={styles.container}>
      {items.map((item, i) => (
        <Animated.View key={`${item.productName}-${i}`} entering={FadeInDown.delay(i * STAGGER_DELAY).springify().damping(15)} style={styles.row}>
          <View style={styles.checkCircle}>
            <Check size={12} color={colors.textInverse} strokeWidth={3} />
          </View>
          <Text style={styles.name} numberOfLines={1}>{item.productName}</Text>
          <Text style={styles.qty}>{item.quantity} {item.unit}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.statusGreenBg, borderRadius: radius.lg },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.statusGreen, alignItems: "center", justifyContent: "center" },
  name: { ...typography.caption, fontWeight: "600", color: colors.navy, flex: 1, minWidth: 0 },
  qty: { ...typography.caption, fontWeight: "700", color: colors.statusGreen, fontVariant: ["tabular-nums"] },
});
