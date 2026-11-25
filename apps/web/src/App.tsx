import { useEffect, useState } from "react";

export default function App() {
  const [api, setApi] = useState("...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setApi(d.status))
      .catch(() => setApi("Not available"));
  }, []);

  return (
    <main>
      <h1 className="">AI Post Recipe</h1>
      <p>API: {api}</p>
    </main>
  );
}
