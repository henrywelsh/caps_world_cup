import React, { useEffect, useState } from 'react';
import { getTeams } from '../api';
import AuctionStatusBar from '../components/AuctionStatusBar/AuctionStatusBar';

const PLACEMENT_PAYOUTS = [
  ['Champion', '12.00%'],
  ['Runner-up', '7.00%'],
  ['3rd place', '4.50%'],
  ['4th place', '3.50%'],
  ['Quarter-final exit (5th–8th)', '3.00% each'],
  ['Round of 16 exit (9th–16th)', '1.75% each'],
  ['Round of 32 exit (17th–32nd)', '0.75% each'],
  ['Group stage exit (33rd–48th)', '0.00%'],
];

const KNOCKOUT_WIN_BONUSES = [
  ['Round of 32 win', '0.50%'],
  ['Round of 16 win', '1.00%'],
  ['Quarter-final win', '1.50%'],
  ['Semi-final win', '2.50%'],
  ['3rd-place match win', '1.50%'],
  ['Final win', '6.50%'],
];

export default function RulesPage() {
  const [auctionData, setAuctionData] = useState(null);

  useEffect(() => {
    getTeams().then(setAuctionData).catch(() => setAuctionData(null));
  }, []);

  return (
    <div>
      {auctionData && (
        <AuctionStatusBar config={auctionData.auction_config} potTotal={auctionData.pot_total} />
      )}

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 16px' }}>
        <h2 style={{ marginBottom: 8 }}>Rules &amp; How It Works</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: 24 }}>
          How the auction works, how ownership is calculated, and how payouts are distributed.
        </p>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>1. Overview</h3>
          <p>
            This is a <strong>shared-ownership auction</strong> for World Cup teams. You spend{' '}
            <strong>caps</strong> to own a percentage of one or more teams, and your ownership
            percentage determines your share of that team's payout as it advances.
          </p>
          <ul>
            <li>Early bids are slightly more valuable than later bids, via a time-based multiplier.</li>
            <li>Ownership can change at any time as new bids are placed — this is expected.</li>
            <li><strong>All bids are final.</strong> There are no refunds, edits, or reversals.</li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>2. How Bidding Works</h3>
          <p>Pick a team, enter the number of caps to bid, and confirm. Your bid applies immediately if it's within your allowed limit.</p>

          <h4 style={{ marginBottom: 4 }}>Time-weighted caps</h4>
          <p style={{ marginTop: 0 }}>
            Each bid is multiplied by a factor based on when it's placed. The multiplier starts at{' '}
            <strong>1.15×</strong> when the auction opens and decays smoothly to{' '}
            <strong>1.00×</strong> by the deadline. <strong>Weighted</strong> caps — not raw caps —
            determine ownership.
          </p>
          <p className="muted" style={{ marginTop: 0 }}>
            Example: 100 caps bid right at the open count as ~115 weighted caps; the same 100 caps
            bid near the deadline count as 100 weighted caps.
          </p>

          <h4 style={{ marginBottom: 4 }}>Ownership</h4>
          <p style={{ marginTop: 0 }}>
            Your ownership of a team = your weighted caps ÷ the team's total weighted caps. The pot
            itself is the sum of all <strong>raw</strong> caps bid.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>3. Payment Rules</h3>
          <ul>
            <li>Until you pay, you can bid up to a <strong>starting cap</strong> (default ~$5) worth of caps.</li>
            <li>When you submit payment via Venmo, an admin records the amount and your bid limit increases by that amount.</li>
            <li>Bids that exceed your current limit are blocked.</li>
            <li>Unpaid bids may be voided, and payouts are withheld until payment is confirmed.</li>
          </ul>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>4. Auction Timing</h3>
          <p>
            Each team has its own countdown timer. When a team's timer runs out, that team{' '}
            <strong>locks</strong> and no more bids are accepted — bidding ends at the deadline, with
            no last-minute extensions.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <h3>5. Payouts</h3>
          <p>
            <strong>100% of the pot</strong> is paid out based on each team's final tournament finish.
            Your payout for a team = that team's total payout × your ownership percentage. Teams that
            receive no bids pay out nothing, and teams eliminated in the group stage earn nothing
            (though their bids still feed the pot).
          </p>
          <p className="muted">
            Payouts have two parts: a <strong>placement</strong> reward (65% of the pot) and a{' '}
            <strong>per-win</strong> bonus for each knockout round a team wins (35% of the pot).
          </p>

          <h4 style={{ marginBottom: 4 }}>Placement rewards (% of pot)</h4>
          <table style={{ marginBottom: 16 }}>
            <thead>
              <tr><th>Finish</th><th>Payout</th></tr>
            </thead>
            <tbody>
              {PLACEMENT_PAYOUTS.map(([label, pct]) => (
                <tr key={label}><td>{label}</td><td>{pct}</td></tr>
              ))}
            </tbody>
          </table>

          <h4 style={{ marginBottom: 4 }}>Knockout per-win bonuses (% of pot per win)</h4>
          <table>
            <thead>
              <tr><th>Round won</th><th>Bonus</th></tr>
            </thead>
            <tbody>
              {KNOCKOUT_WIN_BONUSES.map(([label, pct]) => (
                <tr key={label}><td>{label}</td><td>{pct}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
