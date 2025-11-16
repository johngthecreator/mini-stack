import React from "react";
import ReactDOM from "react-dom/client";
import { routes } from "@/app/pages/routes";

function App() {
  const [path, setPath] = React.useState(window.location.pathname);

  React.useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const route = routes.find((r) => r.path === path);
  if (route && route.view) {
    const View = route.view;
    const script = document.getElementById("loader-data");
    const data = script ? JSON.parse(script.textContent ?? "{}") : null;
    return <View loaderData={data} />;
  }
  return <h1>404 - Not Found</h1>;
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(<App />);
