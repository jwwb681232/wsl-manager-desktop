import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface WslDistribution {
  name: string;
  state: string;
  version: number;
  is_default: boolean;
}

function App() {
  const [distributions, setDistributions] = useState<WslDistribution[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function fetchDistributions() {
      invoke<WslDistribution[]>("list_wsl_distributions")
        .then((data) => {
          setDistributions(data);
          setError(null);
          setLoading(false);
        })
        .catch((err) => {
          setError(String(err));
          setLoading(false);
        });
    }

    fetchDistributions();

    const interval = setInterval(fetchDistributions, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <main className="container">
        <h1>WSL Manager</h1>
        <p>Loading WSL distributions...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container">
        <h1>WSL Manager</h1>
        <p className="error">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>WSL Distributions</h1>
      {distributions.length === 0 ? (
        <p>No WSL distributions found. Install one with <code>wsl --install</code>.</p>
      ) : (
        <table className="distro-table">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>State</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d) => (
              <tr key={d.name} className={d.is_default ? "default-row" : ""}>
                <td>{d.is_default ? "*" : ""}</td>
                <td>{d.name}</td>
                <td>{d.state}</td>
                <td>WSL {d.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default App;
