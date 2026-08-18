/**
 * Wallet.jsx
 * Available / locked / total tokens plus the most recent movements.
 * Balances come from WalletContext so they are always the same numbers the
 * navbar pill is showing.
 */

import { useEffect } from 'react';
import WalletCards from '../components/wallet/WalletCard';
import TransactionTable from '../components/wallet/TransactionTable';
import Button from '../components/common/Button';
import { LoadingBlock } from '../components/common/Spinner';
import useAsync from '../hooks/useAsync';
import { useWallet } from '../context/WalletContext';
import * as walletService from '../api/walletService';
import { IconInfo, IconRefresh } from '../components/common/Icons';

export default function Wallet() {
  const { wallet, refresh } = useWallet();
  const { data: transactions, loading, reload } = useAsync(walletService.fetchTransactions, []);

  useEffect(() => {
    const handler = () => {
      refresh();
      reload().catch(() => {});
    };
    window.addEventListener('pms:resync', handler);
    return () => window.removeEventListener('pms:resync', handler);
  }, [refresh, reload]);

  const recent = (transactions || []).slice(0, 8);

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Wallet</h1>
          <p className="page-subtitle">
            Virtual tokens only. The admin credits them; they cannot be bought, transferred or
            cashed out.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<IconRefresh size={15} />}
          onClick={() => {
            refresh();
            reload();
          }}
        >
          Refresh
        </Button>
      </div>

      <WalletCards wallet={wallet} />

      <div className="notice mt-6">
        <span className="notice__icon">
          <IconInfo size={17} />
        </span>
        <span className="small">
          <strong>Why some tokens are locked</strong>
          When you enter a contest the entry amount plus its 10% simulated charge moves from
          available to locked. It stays there until your shares are matched and settled, or until
          unmatched shares are refunded.
        </span>
      </div>

      <section className="mt-6">
        <div className="page-head" style={{ marginBottom: 'var(--s-4)' }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Recent activity
          </h2>
          <Button variant="subtle" size="sm" to="/history">
            View full history
          </Button>
        </div>

        {loading && !transactions ? (
          <LoadingBlock label="Loading transactions..." />
        ) : (
          <TransactionTable transactions={recent} />
        )}
      </section>
    </div>
  );
}
