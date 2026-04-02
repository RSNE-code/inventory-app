/**
 * CameraCapture — opens camera or image picker for packing slip photos.
 * Uses expo-image-picker (simpler than raw expo-camera for photo capture).
 */
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";

export async function capturePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== "granted") {
    Alert.alert(
      "Camera Permission",
      "ShopBot needs camera access to scan packing slips and BOMs."
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}

export async function pickImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0].uri;
}
