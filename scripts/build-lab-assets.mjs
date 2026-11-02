import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const source = fileURLToPath(new URL("../src/styles/lab-shell.css", import.meta.url));
const destination = fileURLToPath(new URL("../public/generated/lab-shell.css", import.meta.url));
await mkdir(new URL("../public/generated/", import.meta.url), { recursive: true });
const result = await postcss([tailwindcss()]).process(await readFile(source, "utf8"), {
  from: source,
  to: destination,
});
await writeFile(destination, result.css);
await copyFile(fileURLToPath(import.meta.resolve("@monabbous/lumenmorph")),
  new URL("../public/generated/lumenmorph-pointer.mjs", import.meta.url));
