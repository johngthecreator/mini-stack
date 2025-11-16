import Navbar from "../components/Navbar";

export default function About({
  loaderData,
}: {
  loaderData: { message: string };
}) {
  return (
    <>
      <Navbar />
      <div className="px-5 flex flex-col gap-3">
        <h1>About Page</h1>
        <p>{loaderData?.message}</p>
      </div>
    </>
  );
}
