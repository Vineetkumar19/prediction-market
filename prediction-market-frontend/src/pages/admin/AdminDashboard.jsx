/**
 * AdminDashboard.jsx
 * At-a-glance numbers plus the contests that need the admin to do something:
 * declare a result, or cancel because no opponent turned up.
 */

import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import { ContestStatusBadge } from '../../components/common/StatusBadge';
import EmptyState from '../../components/common/EmptyState';
import { LoadingBlock } from '../../components/common/Spinner';
import useAsync from '../../hooks/useAsync';
import * as adminService from '../../api/adminService';
import { formatDateShort, formatTokens } from '../../utils/format';
import { CONTEST_STATUS } from '../../utils/constants';
import { IconChevronRight, IconPlus } from '../../components/common/Icons';

export default function AdminDashboard() {
  const { data: stats, loading } = useAsync(adminService.fetchAdminStats, []);
  const { data: contests } = useAsync(adminService.fetchAdminContests, []);

  const needsAction = (contests || []).filter(
    (c) =>
      [CONTEST_STATUS.MATCHED, CONTEST_STATUS.LOCKED, CONTEST_STATUS.PARTIAL].includes(c.status) &&
      new Date(c.endTime) < new Date()
  );

  const noOpponent = (contests || []).filter(
    (c) =>
      c.status === CONTEST_STATUS.OPEN &&
      new Date(c.matchingDeadline) < new Date() &&
      (c.matchedShares || 0) === 0
  );

  if (loading && !stats) return <LoadingBlock label="Loading admin data..." />;

  const tiles = [
    { label: 'Registered players', value: stats?.users },
    { label: 'Events', value: stats?.events },
    { label: 'Live questions', value: stats?.liveContests },
    { label: 'Total questions', value: stats?.totalContests },
    { label: 'Tokens issued', value: stats?.tokensIssued },
    { label: 'Tokens locked', value: stats?.tokensLocked },
    { label: 'Unmatched orders', value: stats?.openOrders },
  ];

  return (
    <div className="stack stack-6">
      <div className="admin-stat-grid" style={{ marginBottom: 0 }}>
        {tiles.map((tile) => (
          <div className="admin-stat" key={tile.label}>
            <div className="admin-stat__value">{formatTokens(tile.value ?? 0)}</div>
            <div className="admin-stat__label">{tile.label}</div>
          </div>
        ))}
      </div>

      <div className="row row-wrap">
        <Button to="/admin/events" icon={<IconPlus size={16} />}>
          Create an event
        </Button>
        <Button variant="ghost" to="/admin/contests/new">
          Add a question
        </Button>
        <Button variant="ghost" to="/admin/users">
          Give tokens to a player
        </Button>
      </div>

      <section className="card">
        <div className="card-head">
          <h3>Waiting for a result</h3>
          <span className="small muted">{needsAction.length} questions</span>
        </div>
        <div className="card-pad">
          {needsAction.length === 0 ? (
            <EmptyState
              title="Nothing to declare"
              text="Questions appear here once their result time has passed and an outcome is needed."
            />
          ) : (
            <div className="stack stack-3">
              {needsAction.map((c) => (
                <Link key={c.id} to="/admin/contests" className="record">
                  <div className="record__top">
                    <span className="bold small">{c.question}</span>
                    <ContestStatusBadge status={c.status} />
                  </div>
                  <div className="tiny muted">
                    Ended {formatDateShort(c.endTime)} &middot; {c.matchedShares} matched shares
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h3>No opponent found</h3>
          <span className="small muted">{noOpponent.length} questions</span>
        </div>
        <div className="card-pad">
          {noOpponent.length === 0 ? (
            <EmptyState
              title="All clear"
              text="Questions whose deadline passed with zero matched shares show up here so you can cancel and refund them."
            />
          ) : (
            <div className="stack stack-3">
              {noOpponent.map((c) => (
                <Link key={c.id} to="/admin/contests" className="record">
                  <div className="record__top">
                    <span className="bold small">{c.question}</span>
                    <span className="badge badge--red">Cancel &amp; refund</span>
                  </div>
                  <div className="tiny muted">
                    Deadline passed {formatDateShort(c.matchingDeadline)} <IconChevronRight size={12} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
