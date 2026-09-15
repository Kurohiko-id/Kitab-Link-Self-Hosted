import crypto from "node:crypto";
import { getMasterSecret } from "@/lib/auth/master-secret";

export function sign(payload: string): string {
  return crypto.createHmac("sha256", getMasterSecret()).update(payload).digest("hex");
}

export function verify(payload: string, signature: string): boolean {
  const expected = sign(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
}
