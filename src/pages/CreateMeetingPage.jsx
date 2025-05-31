import { useState, useEffect } from 'react';
import { createMeeting } from '../api/meetings';        // fonction API centralisée
import { useNavigate } from 'react-router-dom';
import './CreateMeetingPage.css';                       // nouveau fichier de style

export default function CreateMeetingPage() {
  const navigate = useNavigate();

  // le token est dans le state mais jamais affiché
  const [form, setForm] = useState({
    token: '',
    meeting_code: '',
    content: '',
  });

  const [createdMeeting, setCreatedMeeting] = useState(null);

  /* 🔒  récupère automatiquement le token stocké lors du login */
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) setForm((p) => ({ ...p, token: savedToken }));
  }, []);

  /* handle change pour les deux champs visibles */
  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  /* création du meeting + redirection vers /call/<meeting_code> */
  const handleCreateMeeting = async (e) => {
    e.preventDefault();

    try {
      const payload = { ...form, date: new Date().toISOString() };
      const res = await createMeeting(payload);
      setCreatedMeeting(res.data);                      // juste pour debug/affichage éventuel
      /* ➡ redirection */
      navigate(`/call/${form.meeting_code}`);
    } catch (err) {
      console.error(err);
      alert('❌ Erreur lors de la création du meeting');
    }
  };

  return (
    <div className="create-container">
      <form className="create-form" onSubmit={handleCreateMeeting}>
        <h2 className="form-title">Créer un Meeting</h2>

        <div className="input-box">
          <label>Code du Meeting</label>
          <input
            type="text"
            name="meeting_code"
            value={form.meeting_code}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-box">
          <label>Contenu</label>
          <input
            type="text"
            name="content"
            value={form.content}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" className="submit-button">
          Créer
        </button>

        {createdMeeting && (
          <pre className="debug-json">{JSON.stringify(createdMeeting, null, 2)}</pre>
        )}
      </form>
    </div>
  );
}
