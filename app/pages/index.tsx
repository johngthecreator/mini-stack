import { useState } from "react";
import Navbar from "../components/Navbar";

export default function Index() {
  const handleHello = async () => {
    const response = await fetch("/api/hello");
    const data = await response.json();
    alert(JSON.stringify(data));
  };
  const [name, setName] = useState("");
  return (
    <>
      <Navbar />
      <div className="px-5 space-y-5">
        <h2>Welcom to the Home Page</h2>
        <label className="flex flex-col gap-2">
          Client Side Input Box
          <input
            className="border border-black md:w-1/2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          className="bg-black text-white rounded-full px-4 py-2"
          onClick={handleHello}
        >
          Hello Button
        </button>
      </div>
    </>
  );
}
