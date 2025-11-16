export default function Navbar() {
  return (
    <nav style={{ position: "sticky", top: 0, background: "white" }}>
      <ul>
        <li>
          <strong>Test</strong>
        </li>
      </ul>
      <ul>
        <li>
          <a href="/">Home</a>
        </li>
        <li>
          <a href="/about">About</a>
        </li>
      </ul>
    </nav>
  );
}
