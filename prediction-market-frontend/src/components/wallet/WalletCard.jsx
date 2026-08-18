/**
 * WalletCard.jsx
 * The three balance tiles: available, locked and total.
 *
 *   available = tokens you can spend right now
 *   locked    = tokens committed to contests that have not settled yet
 *   total     = available + locked
 *
 * Values come from WalletContext, so they update the moment anything moves.
 */

import { formatTokens } from '../../utils/format';
import { IconCoins, IconLock, IconWallet } from '../common/Icons';

function BalanceCard({ label, value, hint, icon, hero = false }) {
  return (
    <div className={`balance-card ${hero ? 'balance-card--hero' : ''}`}>
      <span className="balance-card__label">
        {icon} {label}
      </span>
      <span className="balance-card__value">{formatTokens(value)}</span>
      {hint && <span className="balance-card__hint">{hint}</span>}
    </div>
  );
}

export default function WalletCards({ wallet }) {
  return (
    <div className="wallet-grid">
      <BalanceCard
        hero
        label="Available"
        value={wallet.available}
        hint="Ready to use on any open contest"
        icon={<IconWallet size={14} />}
      />
      <BalanceCard
        label="Locked"
        value={wallet.locked}
        hint="Committed to contests that have not settled"
        icon={<IconLock size={14} />}
      />
      <BalanceCard
        label="Total"
        value={wallet.total}
        hint="Available plus locked"
        icon={<IconCoins size={14} />}
      />
    </div>
  );
}

export { BalanceCard };
