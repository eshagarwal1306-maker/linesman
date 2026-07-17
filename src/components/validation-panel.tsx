"use client";

import { useState } from "react";
import { useNetwork } from "@/components/app-providers";
import type { TxlineEvent } from "@/lib/txline/types";

type ValidationResult = {
  valid?: boolean;
  error?: string;
  category?: string;
  [key: string]: unknown;
};

export function ValidationPanel({ event }: { event?: TxlineEvent }) {
  const { network } = useNetwork();
  const [statKeys, setStatKeys] = useState([1]);
  const [status, setStatus] = useState<"idle" | "pending" | "pass" | "fail">(
    "idle",
  );
  const [result, setResult] = useState<ValidationResult>();

  async function validate() {
    if (!event || event.seq === undefined) return;
    setStatus("pending");
    const response = await fetch("/api/txline/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        network,
        fixtureId: event.fixtureId,
        seq: event.seq,
        statKeys,
      }),
    });
    const receipt = (await response.json()) as ValidationResult;
    setResult(receipt);
    setStatus(response.ok && receipt.valid ? "pass" : "fail");
  }

  return (
    <section className="feature-card" aria-labelledby="validation-title">
      <h2 id="validation-title">Proof validation</h2>
      {!event || event.seq === undefined ? (
        <p>Choose a score event with a real sequence.</p>
      ) : (
        <>
          <p>Fixture {event.fixtureId}, sequence {event.seq}</p>
          <fieldset>
            <legend>Stat keys</legend>
            {[1, 2, 3, 4].map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={statKeys.includes(key)}
                  onChange={(change) =>
                    setStatKeys((current) =>
                      change.target.checked
                        ? [...current, key].slice(0, 8)
                        : current.filter((item) => item !== key),
                    )
                  }
                />
                {key}
              </label>
            ))}
          </fieldset>
          <button
            disabled={status === "pending" || statKeys.length === 0}
            onClick={validate}
          >
            {status === "pending" ? "Validating…" : "Validate on-chain"}
          </button>
          <p className={`validation-${status}`}>{status}</p>
          {result?.category && <p>Error type: {result.category}</p>}
          {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </>
      )}
    </section>
  );
}
