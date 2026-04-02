/**
 * CheckoutAllButton — bulk checkout action for BOM.
 */
import { StyleSheet } from "react-native";
import { ShoppingCart } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";

interface CheckoutAllButtonProps {
  onPress: () => void;
  loading?: boolean;
  count: number;
}

export function CheckoutAllButton({ onPress, loading, count }: CheckoutAllButtonProps) {
  if (count === 0) return null;
  return (
    <Button
      title={`Checkout All (${count} items)`}
      icon={<ShoppingCart size={18} color={colors.textInverse} strokeWidth={2} />}
      onPress={onPress}
      loading={loading}
      size="lg"
    />
  );
}
