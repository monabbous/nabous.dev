import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = await readFile(join(process.cwd(), "public", "nabous-dev-logo.svg"));
  const data = "data:image/svg+xml;base64," + svg.toString("base64");
  return new ImageResponse(<img src={data} width={180} height={180} alt="" />, size);
}
