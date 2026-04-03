/**
 * BOM detail screen — delegates to BomDetailContent.
 * This route is used for phone navigation and deep links.
 * iPad: constrained width via IPadPage.
 */
import { useLocalSearchParams } from "expo-router";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { BomDetailContent } from "@/components/bom/BomDetailContent";
import { DETAIL_MAX_WIDTH } from "@/constants/layout";

export default function BomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <>
      <Header title="BOM Detail" showBack />
      <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
        <BomDetailContent bomId={id!} />
      </IPadPage>
    </>
  );
}
