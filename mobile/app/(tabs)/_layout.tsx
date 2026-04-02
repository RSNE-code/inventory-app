/**
 * Tab layout — 5 tabs matching web exactly:
 * Dashboard, Receive, Inventory, BOMs, Assemblies
 */
import { Tabs } from "expo-router";
import { TabBar } from "@/components/layout/TabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarAccessibilityLabel: "Dashboard",
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: "Receive",
          tabBarAccessibilityLabel: "Receive material",
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: "Inventory",
          tabBarAccessibilityLabel: "Inventory list",
        }}
      />
      <Tabs.Screen
        name="boms"
        options={{
          title: "BOMs",
          tabBarAccessibilityLabel: "Bills of materials",
        }}
      />
      <Tabs.Screen
        name="assemblies"
        options={{
          title: "Assemblies",
          tabBarAccessibilityLabel: "Assemblies and build queue",
        }}
      />
    </Tabs>
  );
}
