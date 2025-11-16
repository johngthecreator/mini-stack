export default function Login() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <form
        className="flex flex-col py-4 px-12 rounded-xl border border-solid border-black"
        method="POST"
        action="/api/login"
      >
        <h2 className="font-semibold text-xl mb-4">Welcome Back.</h2>
        <label className="w-full flex flex-col gap-1 mb-2">
          Email
          <input
            className="p-1 rounded border border-solid border-gray-500"
            type="email"
            name="email"
            placeholder="Email"
          />
        </label>
        <label className="w-full flex flex-col gap-1 mb-4">
          Password
          <input
            className="p-1 rounded border border-solid border-gray-500"
            name="password"
            placeholder="Password"
          />
        </label>
        <input
          className="py-1 rounded-full bg-black text-white font-semibold cursor-pointer"
          type="submit"
          value="Login"
        />
      </form>
    </div>
  );
}
