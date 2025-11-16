export default function Signup() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <form method="POST" action="/api/signup">
        <fieldset>
          <label>
            Email
            <input type="email" name="email" placeholder="Email" />
          </label>
          <label>
            Username
            <input type="text" name="username" placeholder="Username" />
          </label>
          <label>
            Password
            <input name="password" placeholder="Password" />
          </label>
        </fieldset>

        <input type="submit" value="Sign Up" />
      </form>
    </div>
  );
}
