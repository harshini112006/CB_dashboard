import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main>
      <div className="empty card">
        <h2>Page not found</h2>
        <p>That page doesn’t exist. <Link className="link" to="/">Back to the overview</Link></p>
      </div>
    </main>
  );
}
