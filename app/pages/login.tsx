export default function Login() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <form method="POST" action="/api/login">
        <fieldset>
          <label>
            Email
            <input type="email" name="email" placeholder="Email" />
          </label>
          <label>
            Password
            <input name="password" placeholder="Password" />
          </label>
        </fieldset>

        <input type="submit" value="Login" />
      </form>
    </div>
  );
}
