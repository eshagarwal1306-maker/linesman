"use client";

import { getNetworkConfig, type Network } from "../lib/network/config";
import { useNetwork } from "../components/app-providers";

const stages = [
  {
    title: "Wallet session",
    description: "Connect a Solana wallet and establish an authenticated session.",
    status: "Ready to connect",
    available: true,
  },
  {
    title: "TxLINE setup",
    description: "Create, subscribe, and activate network-scoped credentials.",
    status: "Connect wallet first",
    available: false,
  },
  {
    title: "Fixtures",
    description: "Browse the current match schedule and select a fixture.",
    status: "Complete setup first",
    available: false,
  },
  {
    title: "Live streams",
    description: "Inspect live odds and score events without changing payloads.",
    status: "Select a fixture first",
    available: false,
  },
  {
    title: "Replay",
    description: "Play historical score records through the same event pipeline.",
    status: "Select a completed fixture",
    available: false,
  },
  {
    title: "Validation",
    description: "Verify observed score records against their on-chain proof.",
    status: "Choose a score event first",
    available: false,
  },
] as const;

export default function Home() {
  const { network, setNetwork } = useNetwork();
  const config = getNetworkConfig(network);

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
        <div className="stage-grid">
          {stages.map((stage, index) => (
            <article
              className={`stage-card${stage.available ? " stage-card-ready" : ""}`}
              key={stage.title}
            >
              <div className="stage-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.description}</p>
              </div>
              <span className="stage-status">
                <span aria-hidden="true">{stage.available ? "●" : "◇"}</span>
                {stage.status}
              </span>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <span>TxLINE starter</span>
        <span>{config.programId.slice(0, 8)}…{config.programId.slice(-6)}</span>
      </footer>
    </main>
  );
}
