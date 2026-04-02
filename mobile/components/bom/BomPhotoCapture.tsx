/**
 * BomPhotoCapture — camera capture for BOM image input.
 */
import { StyleSheet, View, Text, Image } from "react-native";
import { useState } from "react";
import { Camera, X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { capturePhoto, pickImage } from "@/components/ai/CameraCapture";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface BomPhotoCaptureProps {
  onImageCaptured: (uri: string) => void;
}

export function BomPhotoCapture({ onImageCaptured }: BomPhotoCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleCapture = async () => {
    const uri = await capturePhoto();
    if (uri) { setPreview(uri); onImageCaptured(uri); }
  };

  const handlePick = async () => {
    const uri = await pickImage();
    if (uri) { setPreview(uri); onImageCaptured(uri); }
  };

  return (
    <View style={styles.container}>
      {preview ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="cover" />
          <Button title="Retake" variant="secondary" onPress={() => setPreview(null)} size="sm" />
        </View>
      ) : (
        <View style={styles.actions}>
          <Button title="Take Photo" icon={<Camera size={18} color={colors.textInverse} strokeWidth={2} />} onPress={handleCapture} />
          <Button title="Choose from Library" variant="secondary" onPress={handlePick} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  previewWrap: { alignItems: "center", gap: spacing.md },
  preview: { width: "100%", height: 200, borderRadius: radius.xl },
  actions: { gap: spacing.md },
});
