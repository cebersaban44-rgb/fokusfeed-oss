import { describe, expect, it } from "vitest";
import { createEventEnvelope } from "../src/events";
import { createDefaultJobOptions } from "../src/queues";

describe("worker contracts", () => {
  it("creates v1 event envelope", () => {
    const envelope = createEventEnvelope(
      "content.ingested",
      "ingest-worker",
      "content-1",
      "content-1",
      {
        content_id: "content-1",
        source: "twitter",
        published_at: new Date().toISOString()
      }
    );

    expect(envelope.event_version).toBe("v1");
    expect(envelope.event_type).toBe("content.ingested");
    expect(envelope.partition_key).toBe("content-1");
  });

  it("applies queue retry policy defaults", () => {
    const options = createDefaultJobOptions();
    expect(options.attempts).toBe(3);
    expect((options.backoff as { type: string }).type).toBe("exponential");
  });
});
