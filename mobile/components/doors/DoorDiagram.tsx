/**
 * DoorDiagram — SVG door visualization showing dimensions and swing direction.
 * Covers door-diagram-contextual, door-diagram-slider, door-diagram-swing.
 */
import { StyleSheet, View, Text } from "react-native";
import Svg, { Rect, Line, Path, Text as SvgText } from "react-native-svg";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { parseWidthInches, type DoorSpecs } from "@/lib/door-specs";

interface DoorDiagramProps {
  specs: Partial<DoorSpecs>;
  width?: number;
  height?: number;
}

export function DoorDiagram({ specs, width = 200, height = 260 }: DoorDiagramProps) {
  const w = parseWidthInches(specs.widthInClear ?? "36");
  const h = parseWidthInches(specs.heightInClear ?? "84");
  const isSlider = specs.doorCategory === "SLIDING";
  const hingeSide = specs.hingeSide ?? "LEFT";

  // Scale to fit
  const padding = 30;
  const drawW = width - padding * 2;
  const drawH = height - padding * 2;
  const scale = Math.min(drawW / w, drawH / h);
  const doorW = w * scale;
  const doorH = h * scale;
  const x = (width - doorW) / 2;
  const y = (height - doorH) / 2;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        {/* Frame */}
        <Rect x={x} y={y} width={doorW} height={doorH} fill="none" stroke={colors.navy} strokeWidth={2} />

        {/* Door panel */}
        <Rect x={x + 3} y={y + 3} width={doorW - 6} height={doorH - 6} fill={colors.statusBlueBg} stroke={colors.brandBlue} strokeWidth={1} />

        {isSlider ? (
          /* Slider arrow */
          <Path
            d={`M${x + doorW * 0.3},${y + doorH / 2} L${x + doorW * 0.7},${y + doorH / 2}`}
            stroke={colors.brandOrange} strokeWidth={2} markerEnd="url(#arrow)"
          />
        ) : (
          /* Swing arc */
          <Path
            d={hingeSide === "LEFT"
              ? `M${x},${y + doorH} A${doorW},${doorW} 0 0,1 ${x + doorW},${y + doorH}`
              : `M${x + doorW},${y + doorH} A${doorW},${doorW} 0 0,0 ${x},${y + doorH}`
            }
            fill="none" stroke={colors.brandOrange} strokeWidth={1.5} strokeDasharray="4,4"
          />
        )}

        {/* Width label */}
        <SvgText x={width / 2} y={y - 8} textAnchor="middle" fill={colors.textSecondary} fontSize={11} fontWeight="600">
          {specs.widthInClear ?? "36\""} W
        </SvgText>

        {/* Height label */}
        <SvgText x={x - 8} y={y + doorH / 2} textAnchor="middle" fill={colors.textSecondary} fontSize={11} fontWeight="600" rotation="-90" originX={x - 8} originY={y + doorH / 2}>
          {specs.heightInClear ?? "84\""} H
        </SvgText>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
});
