import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function MeetingsPage() {
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const createMeeting = () => {
    const newRoomId = uuidv4();
    navigate(`/call?room=${newRoomId}`);
  };

  const joinMeeting = () => {
    if (roomId.trim()) {
      navigate(`/call?room=${roomId}`);
    } else {
      alert('Veuillez entrer un identifiant de salle.');
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial', maxWidth: '600px', margin: 'auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Réunions</h2>
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <button
          onClick={createMeeting}
          style={{
            padding: '12px 24px',
            background: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Créer une nouvelle réunion
        </button>
      </div>
      <div style={{ padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ margin: '0 0 10px', color: '#333' }}>Rejoindre une réunion</h3>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Entrez l'identifiant de la salle"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            marginBottom: '10px',
          }}
        />
        <button
          onClick={joinMeeting}
          style={{
            width: '100%',
            padding: '10px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          Rejoindre
        </button>
      </div>
    </div>
  );
}