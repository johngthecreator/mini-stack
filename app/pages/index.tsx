import { useState } from "react";
import Navbar from "../components/Navbar";

export default function Index() {
  const handleHello = async () => {
    console.log("hello");
    const response = await fetch("/api/hello");
    const data = await response.json();
    alert(JSON.stringify(data));
  };
  const [name, setName] = useState("");
  return (
    <div>
      <Navbar />
      <h2>Home</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleHello}>Hello</button>
    </div>
  );
}
