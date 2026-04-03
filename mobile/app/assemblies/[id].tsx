/**
 * Assembly detail screen — delegates to AssemblyDetailContent.
 * This route is used for phone navigation and deep links.
 * iPad: constrained width via IPadPage.
 */
import { useLocalSearchParams } from "expo-router";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { AssemblyDetailContent } from "@/components/assemblies/AssemblyDetailContent";
import { DETAIL_MAX_WIDTH } from "@/constants/layout";

export default function AssemblyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Header title="Assembly" showBack />
      <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
        <AssemblyDetailContent assemblyId={id!} />
      </IPadPage>
    </>
  );
}
