import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MeetingsPage from './pages/MeetingsPage';
import HistoryPage from './pages/HistoryPage';
import VideoCallPage from './pages/VideoCallPage';
import CreateMeeting from './pages/CreateMeetingPage';


export default function App() {
  return (
    <BrowserRouter>
      <nav>
        {/* <Link to="/">Login</Link> | <Link to="/register">Register</Link> | <Link to="/meetings">Meetings</Link> | <Link to="/history">History</Link> */}
      </nav>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/meetings" element={<MeetingsPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/call/:meeting_code" element={<VideoCallPage />} />
        <Route path="/create" element={<CreateMeeting />} />

      </Routes>
    </BrowserRouter>
  );
}
