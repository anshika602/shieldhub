import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="flex items-center justify-between px-8 py-4 border-b">
      <Link to="/" className="text-2xl font-bold">
        ShieldHub
      </Link>

      <div className="flex gap-6">
        <Link to="/">Dashboard</Link>
        <Link to="/repositories">Repositories</Link>
        <Link to="/profile">Profile</Link>
      </div>
    </nav>
  );
}

export default Navbar;