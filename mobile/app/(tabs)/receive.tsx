/**
 * Receive tab — two tabs: AI Receive + Receipt History.
 * iPad: centered content via IPadPage.
 * Receipt History renders its own FlatList (not nested in ScrollView).
 */
import { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/layout/Header";
import { Tabs } from "@/components/ui/Tabs";
import { IPadPage } from "@/components/layout/iPadPage";
import { ReceivingFlow } from "@/components/receiving/ReceivingFlow";
import { ReceiptHistory } from "@/components/receiving/ReceiptHistory";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { spacing, FORM_MAX_WIDTH } from "@/constants/layout";

const TABS = [
  { key: "receive", label: "AI Receive" },
  { key: "history", label: "Receipt History" },
];

export default function ReceiveScreen() {
  const [activeTab, setActiveTab] = useState("receive");
  const insets = useSafeAreaInsets();
  const { screenPadding } = useResponsiveSpacing();

  return (
    <>
      <Header title="Receive Material" />
      <View style={styles.container}>
        <View style={[styles.tabBar, { paddingHorizontal: screenPadding }]}>
          <Tabs tabs={TABS} activeKey={activeTab} onTabChange={setActiveTab} />
        </View>

        {activeTab === "receive" ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
          >
            <IPadPage maxWidth={FORM_MAX_WIDTH}>
              <ReceivingFlow />
            </IPadPage>
          </ScrollView>
        ) : (
          <View style={[styles.content, { paddingHorizontal: screenPadding }]}>
            <IPadPage maxWidth={FORM_MAX_WIDTH} style={styles.content}>
              <ReceiptHistory />
            </IPadPage>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    paddingTop: spacing.md,
  },
  content: {
    flex: 1,
  },
});
