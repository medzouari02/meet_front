import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';

export default function VideoCallPage() {
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const socketIdRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videos, setVideos] = useState([]);
  const [participants, setParticipants] = useState([]);
  const navigate = useNavigate();
  const { meeting_code } = useParams(); // Récupère meeting_code depuis l'URL

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (!meeting_code) {
      alert('Aucun code de réunion fourni.');
      navigate('/meetings');
      return;
    }

    socket.connect();
    socketIdRef.current = socket.id;

    const setupLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        return stream;
      } catch (e) {
        console.error('❌ Erreur accès média:', e);
        alert('Impossible d’accéder à la caméra/micro. Vérifiez les permissions.');
        return null;
      }
    };

    const createPeerConnection = (sid, localStream) => {
      if (peerConnections.current[sid]) return peerConnections.current[sid];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current[sid] = pc;

      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });

      pc.ontrack = (event) => {
        setVideos((prev) => {
          const existing = prev.find((v) => v.socketId === sid);
          if (existing) {
            return prev.map((v) =>
              v.socketId === sid ? { ...v, stream: event.streams[0] } : v
            );
          }
          return [...prev, { socketId: sid, stream: event.streams[0] }];
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('signal', {
            to: sid,
            data: JSON.stringify({ ice: event.candidate }),
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          cleanupPeerConnection(sid);
        }
      };

      return pc;
    };

    const initiateOffer = async (sid, pc) => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('signal', {
          to: sid,
          data: JSON.stringify({ sdp: pc.localDescription }),
        });
      } catch (e) {
        console.error('❌ Erreur création offre:', e);
      }
    };

    const handleSignal = async ({ from, data }) => {
      const signal = JSON.parse(data);
      let pc = peerConnections.current[from];

      if (!pc && signal.sdp && signal.sdp.type === 'offer') {
        const localStream = localStreamRef.current;
        if (!localStream) return;
        pc = createPeerConnection(from, localStream);
      }

      if (!pc) return;

      try {
        if (signal.sdp) {
          const desc = new RTCSessionDescription(signal.sdp);
          if (desc.type === 'offer') {
            await pc.setRemoteDescription(desc);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('signal', {
              to: from,
              data: JSON.stringify({ sdp: pc.localDescription }),
            });
          } else if (desc.type === 'answer') {
            await pc.setRemoteDescription(desc);
          }
        } else if (signal.ice) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
        }
      } catch (e) {
        console.error('❌ Erreur signal:', e);
      }
    };

    const cleanupPeerConnection = (sid) => {
      if (peerConnections.current[sid]) {
        peerConnections.current[sid].close();
        delete peerConnections.current[sid];
      }
      setVideos((prev) => prev.filter((v) => v.socketId !== sid));
      setParticipants((prev) => prev.filter((p) => p !== sid));
    };

    setupLocalStream().then((localStream) => {
      if (!localStream) return;

      socket.on('connect', () => {
        socketIdRef.current = socket.id;
        socket.emit('join_call', meeting_code); // Utilise meeting_code comme room
      });

      socket.on('user-joined', (sid, clients) => {
        setParticipants(clients);
        if (sid !== socketIdRef.current && !peerConnections.current[sid]) {
          const pc = createPeerConnection(sid, localStream);
          initiateOffer(sid, pc);
        }
      });

      socket.on('user-left', (sid) => {
        cleanupPeerConnection(sid);
      });

      socket.on('chat-message', (data) => {
        setMessages((prev) => [...prev, data]);
      });

      socket.on('signal', handleSignal);
    });

    return () => {
      socket.disconnect();
      Object.keys(peerConnections.current).forEach(cleanupPeerConnection);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [meeting_code, navigate]);

  const copyRoomLink = () => {
    const link = `${window.location.origin}/call/${meeting_code}`;
    navigator.clipboard.writeText(link);
    alert('Lien de la réunion copié !');
  };

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('chat_message', message);
      setMessages((prev) => [...prev, `Moi: ${message}`]);
      setMessage('');
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setAudioEnabled(audioTrack.enabled);
    }
  };

  const leaveMeeting = () => {
    socket.disconnect();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate('/meetings');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial', background: '#f5f5f5' }}>
      <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Vidéo locale */}
          <div style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white' }}>
              Moi
            </div>
          </div>
          {/* Vidéos des autres participants */}
          {videos.map((video) => (
            <div
              key={video.socketId}
              style={{ position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden' }}
            >
              <video
                ref={(ref) => {
                  if (ref && video.stream) {
                    ref.srcObject = video.stream;
                  }
                }}
                autoPlay
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white' }}>
                Participant {video.socketId.slice(0, 4)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barre latérale pour le chat */}
      <div
        style={{
          width: '300px',
          background: '#fff',
          borderLeft: '1px solid #ddd',
          display: 'flex',
          flexDirection: 'column',
          padding: '10px',
        }}
      >
        <h3 style={{ margin: '0 0 10px', padding: '10px', borderBottom: '1px solid #ddd' }}>
          Chat
        </h3>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
            background: '#f9f9f9',
            borderRadius: '4px',
          }}
        >
          {messages.map((msg, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <span style={{ color: msg.startsWith('Moi:') ? '#1a73e8' : '#333' }}>
                {msg}
              </span>
            </div>
          ))}
        </div>
        <div style={{ padding: '10px', borderTop: '1px solid #ddd' }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez un message..."
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
        </div>
      </div>

      {/* Barre de contrôle */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#fff',
          padding: '10px',
          borderRadius: '50px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          display: 'flex',
          gap: '10px',
        }}
      >
        <button
          onClick={toggleVideo}
          style={{
            padding: '10px',
            background: videoEnabled ? '#333' : '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          {videoEnabled ? '📹' : '📷'}
        </button>
        <button
          onClick={toggleAudio}
          style={{
            padding: '10px',
            background: audioEnabled ? '#333' : '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          {audioEnabled ? '🎤' : '🔇'}
        </button>
        <button
          onClick={copyRoomLink}
          style={{
            padding: '10px',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          🔗
        </button>
        <button
          onClick={leaveMeeting}
          style={{
            padding: '10px',
            background: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        >
          ❌
        </button>
      </div>
    </div>
  );
}