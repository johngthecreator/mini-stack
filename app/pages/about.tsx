import Navbar from "../components/Navbar";

export default function About({
  loaderData,
}: {
  loaderData: { message: string };
}) {
  return (
    <div>
      <Navbar />
      <h1>About Page</h1>
      {loaderData?.message}
    </div>
  );
}
