"use client";

import { useCallback, useState } from "react";
import { getNetworkConfig, type Network } from "../lib/network/config";
import { useNetwork } from "../components/app-providers";
import { WalletSession } from "../components/wallet-session";
import { TxlineSetup } from "../components/txline-setup";
import { FixtureBrowser } from "../components/fixture-browser";
import { LiveStream } from "../components/live-stream";
import { ReplayPanel } from "../components/replay-panel";
import { ValidationPanel } from "../components/validation-panel";
import type { TxlineEvent } from "../lib/txline/types";

export default function Home() {
  const { network, setNetwork } = useNetwork();
  const config = getNetworkConfig(network);
  const [authenticated, setAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);
  const [setupBusy, setSetupBusy] = useState(false);
  const [fixtureId, setFixtureId] = useState<number | null>(null);
  const [validationEvent, setValidationEvent] = useState<TxlineEvent>();
  const handleSession = useCallback(
    (session: { userId: string; walletPublicKey: string } | null) => {
      setAuthenticated(Boolean(session));
      if (!session) {
        setReady(false);
        setFixtureId(null);
        setValidationEvent(undefined);
      }
    },
    [],
  );
  const handleReady = useCallback((value: boolean) => setReady(value), []);

  return (
    <main>
      <header className="masthead">
        <a className="wordmark" href="#top" aria-label="TxLINE starter home">
          Tx<span>LINE</span>
        </a>
        <div className="network-control" aria-label="Solana network">
          <span className="signal-dot" aria-hidden="true" />
          <label htmlFor="network">Network</label>
          <select
            id="network"
            disabled={setupBusy}
            value={network}
            onChange={(event) => setNetwork(event.target.value as Network)}
          >
            <option value="devnet">Devnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
        </div>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow">Solana data integration workspace</p>
        <h1>One signal path.<br />No crossed networks.</h1>
        <p className="intro">
          A neutral foundation for connecting a wallet, activating TxLINE,
          streaming match data, replaying history, and validating proofs.
        </p>
        <dl className="network-readout">
          <div>
            <dt>Active cluster</dt>
            <dd>{network}</dd>
          </div>
          <div>
            <dt>Service levels</dt>
            <dd>{config.serviceLevels.join(" / ")}</dd>
          </div>
          <div>
            <dt>API host</dt>
            <dd>{new URL(config.apiOrigin).host}</dd>
          </div>
        </dl>
      </section>

      <section className="pipeline" aria-labelledby="pipeline-title">
        <div className="section-heading">
          <p>Integration path</p>
          <h2 id="pipeline-title">Build from wallet to proof.</h2>
        </div>
        <div className="feature-grid">
          <WalletSession onSession={handleSession} />
          <TxlineSetup
            authenticated={authenticated}
            onReady={handleReady}
            onBusy={setSetupBusy}
          />
          <FixtureBrowser active={ready} onSelect={setFixtureId} />
          <LiveStream fixtureId={fixtureId} onVerify={setValidationEvent} />
          <ReplayPanel fixtureId={fixtureId} onVerify={setValidationEvent} />
          <ValidationPanel event={validationEvent} />
        </div>
      </section>

      <footer>
        <span>TxLINE starter</span>
        <span>{config.programId.slice(0, 8)}…{config.programId.slice(-6)}</span>
      </footer>
    </main>
  );
}
