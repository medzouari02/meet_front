import { useState } from 'react';
import { login } from '../api/auth';
import './LoginPage.css'; // Import du fichier CSS
import contactImg from '../assets/meet.webp'; // Mets l’image dans src/assets/contact.png

export default function LoginPage() {
  const [form, setForm] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await login(form);
      const token = res.data.token;
      const user_id = res.data.id;
      const role = res.data.role;
      const name =res.data.name;
      console.log(role)
      localStorage.setItem('token', token);
      localStorage.setItem('user_id', user_id);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      
      alert('✅ Connexion réussie');
    } catch (err) {
      alert('❌ Échec de la connexion');
      console.error(err);
    }
  };

  return (
    <div className="container">
      <div className="content">
        <div className="image-box">
          <img src={contactImg} alt="Connexion" />
        </div>
        <form onSubmit={handleLogin}>
          <div className="topic">Connexion</div>

          <div className="input-box">
            <input
              type="text"
              name="username"
              required
              value={form.username}
              onChange={handleChange}
            />
            <label>Nom d'utilisateur</label>
          </div>

          <div className="input-box">
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleChange}
            />
            <label>Mot de passe</label>
          </div>

          <div className="input-box">
            <input type="submit" value="Se connecter" />
          </div>
        </form>
      </div>
    </div>
  );
}
