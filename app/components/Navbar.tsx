export default function Navbar() {
  return (
    <nav
      className="flex flex-row justify-between p-5 items-center"
      style={{ position: "sticky", top: 0, background: "white" }}
    >
      <strong>Test</strong>
      <ul className="flex flex-row gap-3">
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/about">About</a>
        </li>
        <li>
          <form method="POST" action="/api/signout">
            <button type="submit">Sign Out</button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
