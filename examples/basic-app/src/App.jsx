import { useState } from "react";

export function App() {
  const [count, setCount] = useState(0);
  const [data, setData] = useState();

  const fetchAPI = () =>
    fetch("/hello")
      .then((res) => res.text())
      .then((res) => setData(res));

  return (
    <div>
      <h1>React + Vite + Express</h1>
      <p>
        Edit <b>src/App.tsx</b> and save to see HMR in action!
      </p>
      <div>
        <button onClick={() => setCount((count) => count + 1)}>
          Count: {count}
        </button>
      </div>
      <div>
        <button onClick={() => fetchAPI()}>Fetch data from server</button>
        <p>{data}</p>
      </div>
    </div>
  );
}
