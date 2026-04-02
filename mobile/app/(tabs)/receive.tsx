/**
 * Receive tab — two tabs: AI Receive + Receipt History.
 * Matches web's receiving/page.tsx layout.
 */
import { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/layout/Header";
import { Tabs } from "@/components/ui/Tabs";
import { ReceivingFlow } from "@/components/receiving/ReceivingFlow";
import { ReceiptHistory } from "@/components/receiving/ReceiptHistory";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

const TABS = [
  { key: "receive", label: "AI Receive" },
  { key: "history", label: "Receipt History" },
];

export default function ReceiveScreen() {
  const [activeTab, setActiveTab] = useState("receive");
  const insets = useSafeAreaInsets();

  return (
    <>
      <Header title="Receive Material" />
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <Tabs tabs={TABS} activeKey={activeTab} onTabChange={setActiveTab} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {activeTab === "receive" ? <ReceivingFlow /> : <ReceiptHistory />}
        </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
});
