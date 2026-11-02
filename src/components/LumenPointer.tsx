"use client";

import { trackPointer } from "@monabbous/lumenmorph";
import { useEffect } from "react";

export function LumenPointer() {
  useEffect(() => trackPointer(), []);

  return null;
}
