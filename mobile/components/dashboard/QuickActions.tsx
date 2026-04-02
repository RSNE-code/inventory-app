/**
 * QuickActions — quick action buttons on dashboard.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { PackageCheck, ClipboardList, Factory, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

const ACTIONS = [
  { label: "Receive", icon: PackageCheck, color: colors.brandBlue, route: "/(tabs)/receive" },
  { label: "New BOM", icon: ClipboardList, color: colors.brandOrange, route: "/boms/new" },
  { label: "New Assembly", icon: Factory, color: colors.statusGreen, route: "/assemblies/new" },
  { label: "New Product", icon: Plus, color: colors.navy, route: "/inventory/new" },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((action) => (
        <Pressable
          key={action.label}
          style={styles.action}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(action.route as any); }}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${action.color}15` }]}>
            <action.icon size={22} color={action.color} strokeWidth={1.8} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: spacing.md },
  action: { flex: 1, alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md },
  iconWrap: { width: 48, height: 48, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  label: { ...typography.caption, fontWeight: "600", color: colors.textSecondary, textAlign: "center" },
});
