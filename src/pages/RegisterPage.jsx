import React, { useState } from 'react';
import { registerEtudiant, registerEnseignant } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import './RegisterPage.css'; // Fichier CSS dédié
import contactImg from '../assets/meet.webp'; // Même image que LoginPage

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'etudiant',
    classe: '',
    matiere: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      classe: formData.role === 'etudiant' ? formData.classe : null,
      matiere: formData.role === 'enseignant' ? formData.matiere : null,
    };

    try {
      let res;
      if (formData.role === 'etudiant') {
        res = await registerEtudiant(payload);
      } else {
        res = await registerEnseignant(payload);
      }

      alert('✅ Inscription réussie');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      alert('❌ Erreur lors de l’inscription');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="content">
        <div className="image-box">
          <img src={contactImg} alt="Inscription" />
        </div>
        <form onSubmit={handleSubmit}>
          <div className="topic">Inscription</div>

          <div className="input-box">
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
            />
            <label>Nom complet</label>
          </div>

          <div className="input-box">
            <input
              type="text"
              name="username"
              required
              value={formData.username}
              onChange={handleChange}
            />
            <label>Nom d'utilisateur</label>
          </div>

          <div className="input-box">
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
            />
            <label>Mot de passe</label>
          </div>

          <div className="input-box">
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="etudiant">Étudiant</option>
              <option value="enseignant">Enseignant</option>
            </select>
            <label>Rôle</label>
          </div>

          {formData.role === 'etudiant' && (
            <div className="input-box">
              <input
                type="text"
                name="classe"
                required
                value={formData.classe}
                onChange={handleChange}
              />
              <label>Classe</label>
            </div>
          )}

          {formData.role === 'enseignant' && (
            <div className="input-box">
              <input
                type="text"
                name="matiere"
                required
                value={formData.matiere}
                onChange={handleChange}
              />
              <label>Matière</label>
            </div>
          )}

          <div className="input-box">
            <input type="submit" value="S'inscrire" />
          </div>

          <p className="message">
            Déjà un compte ? <a href="/">Se connecter</a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;