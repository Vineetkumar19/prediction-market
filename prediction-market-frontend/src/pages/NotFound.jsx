/**
 * NotFound.jsx
 * Catch-all route.
 */

import Button from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="container notfound">
      <div className="stack stack-4" style={{ alignItems: 'center' }}>
        <div className="notfound__code">404</div>
        <h1>This page does not exist</h1>
        <p className="muted" style={{ maxWidth: '42ch' }}>
          The link may be old, or the contest it pointed to was removed.
        </p>
        <Button to="/">Back to contests</Button>
      </div>
    </div>
  );
}
