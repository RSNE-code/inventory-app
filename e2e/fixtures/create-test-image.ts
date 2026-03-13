// Creates a simple packing slip PNG for test use
// Run: npx ts-node e2e/fixtures/create-test-image.ts

import fs from "fs"
import path from "path"

// Minimal valid 1x1 white PNG
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64"
)

fs.writeFileSync(path.join(__dirname, "test-packing-slip.png"), MINIMAL_PNG)
console.log("Created test-packing-slip.png")
