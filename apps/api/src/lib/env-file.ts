import { existsSync, readFileSync } from "node:fs";

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function loadProcessEnvFromFiles(candidates: string[]): void {
  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const sepIndex = trimmed.indexOf("=");
      if (sepIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, sepIndex).trim();
      const rawValue = trimmed.slice(sepIndex + 1).trim();

      if (!key || process.env[key] !== undefined) {
        continue;
      }

      process.env[key] = unquote(rawValue);
    }
  }
}
