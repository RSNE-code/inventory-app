/**
 * ErrorBoundary — catches render errors and shows fallback UI.
 */
import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { Button } from "@/components/ui/Button";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? "An unexpected error occurred"}
          </Text>
          <Button
            title="Restart"
            variant="secondary"
            onPress={this.handleReset}
            style={styles.button}
          />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  title: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.lg,
  },
});
