import { useEffect, useState } from 'react';
import { getHistory, addToHistory } from '../api/auth';

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [entry, setEntry] = useState('');

  const loadHistory = async () => {
    const res = await getHistory();
    setHistory(res.data);
  };

  const addEntry = async () => {
    await addToHistory({ entry });
    loadHistory();
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="container">
      <h2>History</h2>
      <input value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="Add history" />
      <button onClick={addEntry}>Add</button>
      <ul>
        {history.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
