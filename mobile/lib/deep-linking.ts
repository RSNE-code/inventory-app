/**
 * Deep linking — handles shopbot:// URL scheme.
 */
import * as Linking from "expo-linking";
import { router } from "expo-router";

/** Set up deep link listener. Returns subscription to clean up. */
export function setupDeepLinking() {
  const subscription = Linking.addEventListener("url", ({ url }) => {
    handleDeepLink(url);
  });

  // Handle URL that launched the app
  Linking.getInitialURL().then((url) => {
    if (url) handleDeepLink(url);
  });

  return subscription;
}

function handleDeepLink(url: string) {
  const parsed = Linking.parse(url);
  const path = parsed.path;

  if (!path) return;

  // Route to the appropriate screen
  if (path.startsWith("inventory/")) {
    router.push(`/inventory/${path.split("/")[1]}`);
  } else if (path.startsWith("boms/")) {
    router.push(`/boms/${path.split("/")[1]}`);
  } else if (path.startsWith("assemblies/")) {
    router.push(`/assemblies/${path.split("/")[1]}`);
  } else if (path === "cycle-counts") {
    router.push("/cycle-counts");
  } else if (path === "settings") {
    router.push("/settings");
  }
}
