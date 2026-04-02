/**
 * ResponsiveGrid — adaptive column grid for iPad.
 * 1 column on iPhone, 2+ columns on iPad.
 */
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useColumns } from "@/lib/hooks/useDeviceType";
import { spacing } from "@/constants/layout";

interface ResponsiveGridProps {
  children: React.ReactNode[];
  phoneColumns?: number;
  tabletColumns?: number;
  gap?: number;
  style?: ViewStyle;
}

export function ResponsiveGrid({
  children,
  phoneColumns = 1,
  tabletColumns = 2,
  gap = spacing.md,
  style,
}: ResponsiveGridProps) {
  const columns = useColumns(phoneColumns, tabletColumns);

  // Chunk children into rows
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += columns) {
    rows.push(children.slice(i, i + columns));
  }

  return (
    <View style={[styles.container, { gap }, style]}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { gap }]}>
          {row.map((child, colIndex) => (
            <View key={colIndex} style={styles.cell}>
              {child}
            </View>
          ))}
          {/* Fill empty cells to maintain grid alignment */}
          {row.length < columns &&
            Array.from({ length: columns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.cell} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: "row",
  },
  cell: {
    flex: 1,
  },
});
