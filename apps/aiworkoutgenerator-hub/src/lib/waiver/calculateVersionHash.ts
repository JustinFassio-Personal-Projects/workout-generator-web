/**
 * Calculate SHA-256 hash of waiver content for version integrity.
 * This is a client-side utility function that mirrors the server-side hash calculation.
 *
 * @param content - The waiver content to hash
 * @returns SHA-256 hash as hex string
 */
export async function calculateVersionHashClient(
  content: string
): Promise<string> {
  // Use Web Crypto API (available in browsers and Node.js 18+)
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}
