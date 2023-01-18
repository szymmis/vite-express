import { useEffect, useState } from "react";

export function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState<string>();

  useEffect(() => {
    fetch("/hello")
      .then((res) => res.text())
      .then((res) => setData(res));
  });

  return (
    <div>
      <h1>Hello from React + Vite + Express</h1>
      <p>
        Edit <b>App.tsx</b> to see HMR in action!
      </p>
      <div>
        <button onClick={() => setCount((count) => count + 1)}>
          Count: {count}
        </button>
      </div>
      <p>Data from server: {data}</p>
    </div>
  );
}
