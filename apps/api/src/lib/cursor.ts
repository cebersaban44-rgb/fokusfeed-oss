export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

export function decodeCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: number };
    return typeof decoded.offset === "number" && decoded.offset >= 0 ? decoded.offset : 0;
  } catch {
    return 0;
  }
}
