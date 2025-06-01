import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';

export default function VideoCallPage() {
  const localVideoRef = useRef(null);
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const socketIdRef = useRef(null);
  const engagementSocketRef = useRef(null);
  const chatSocketRef = useRef(null);
  const [messages, setMessages] = useState([]); // [{ text, classification, confidence, timestamp, isError }]
  const [message, setMessage] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videos, setVideos] = useState([]);
  const [participants, setParticipants] = useState([]); // { socketId, name, role }
  const [engagementStatus, setEngagementStatus] = useState({});
  const [notification, setNotification] = useState(''); // For in-app error messages
  const navigate = useNavigate();
  const { meeting_code } = useParams();

  const userName = localStorage.getItem('name') || 'Moi';
  const userRole = localStorage.getItem('role') || 'participant';

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const captureFrame = (videoElement) => {
    if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) {
      console.warn('CaptureFrame: Vidéo non disponible ou dimensions invalides');
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg');
  };

  const connectEngagementWebSocket = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const normalizedApiUrl = API_URL.replace(/\/+$/, '');
    const wsUrl = `${normalizedApiUrl.replace('http', 'ws')}/ws/engagement`;
    console.log('Tentative de connexion WebSocket engagement à:', wsUrl);
    const ws = new WebSocket(wsUrl);
    engagementSocketRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket pour engagement connecté');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Engagement reçu:', data);
        if (data.status === 'success' && data.engagement) {
          setEngagementStatus((prev) => ({ ...prev, [userName]: data.engagement }));
        } else {
          console.log(`Engagement status: ${data.status}`);
        }
      } catch (e) {
        console.error('Erreur lors du parsing du message WebSocket engagement:', e);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket engagement déconnecté:', { code: event.code, reason: event.reason });
    };

    ws.onerror = (error) => {
      console.error('Erreur WebSocket engagement:', error);
    };

    return ws;
  };

  const connectChatWebSocket = () => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const normalizedApiUrl = API_URL.replace(/\/+$/, '');
    const wsUrl = `${normalizedApiUrl.replace('http', 'ws')}/ws/chat`;
    console.log('Tentative de connexion WebSocket chat à:', wsUrl);
    let ws = new WebSocket(wsUrl);
    chatSocketRef.current = ws;

    const reconnect = () => {
      if (ws.readyState === WebSocket.CLOSED) {
        console.log('Reconnexion WebSocket chat...');
        ws = new WebSocket(wsUrl);
        chatSocketRef.current = ws;
        attachWebSocketHandlers(ws);
      }
    };

    const attachWebSocketHandlers = (socket) => {
      socket.onopen = () => {
        console.log('WebSocket pour chat connecté');
        setNotification('');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Chat message reçu:', data);
          if (data.status === 'success') {
            const newMessage = {
              text: data.text,
              classification: data.classification || 'unknown',
              confidence: data.confidence || 0,
              timestamp: Date.now(),
              isError: false,
            };
            setMessages((prev) => {
              const isDuplicate = prev.some(
                (msg) => msg.text === data.text && Math.abs(msg.timestamp - newMessage.timestamp) < 1000
              );
              return isDuplicate ? prev : [...prev, newMessage];
            });
            const sender = data.text.split(':')[0].trim();
            setEngagementStatus((prev) => ({
              ...prev,
              [sender]: data.classification,
            }));
          } else if (data.status === 'error') {
            setMessages((prev) => [
              ...prev,
              {
                text: `Erreur: ${data.message}`,
                timestamp: Date.now(),
                isError: true,
              },
            ]);
          }
        } catch (e) {
          console.error('Erreur lors du parsing du message WebSocket chat:', e);
          setMessages((prev) => [
            ...prev,
            {
              text: 'Erreur: Impossible de traiter le message du serveur',
              timestamp: Date.now(),
              isError: true,
            },
          ]);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket chat déconnecté:', { code: event.code, reason: event.reason });
        setNotification('WebSocket chat déconnecté. Reconnexion en cours...');
        setTimeout(reconnect, 3000); // Retry every 3 seconds
      };

      socket.onerror = (error) => {
        console.error('Erreur WebSocket chat:', error);
        setNotification('Erreur de connexion WebSocket pour le chat.');
      };
    };

    attachWebSocketHandlers(ws);
    return ws;
  };

  useEffect(() => {
    if (!meeting_code) {
      setNotification('Aucun code de réunion fourni.');
      navigate('/meetings');
      return;
    }

    socket.connect();
    socketIdRef.current = socket.id;

    socket.on('connect_error', (error) => {
      console.error('Erreur de connexion Socket.IO:', error.message);
      setNotification('Erreur de connexion au serveur Socket.IO.');
    });

    socket.on('connect_timeout', () => {
      console.error('Timeout de connexion Socket.IO');
      setNotification('Timeout de connexion Socket.IO.');
    });

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
        setNotification('Impossible d’accéder à la caméra/micro. Vérifiez les permissions.');
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
      setParticipants((prev) => prev.filter((p) => p.socketId !== sid));
    };

    let intervalId;
    setupLocalStream().then((localStream) => {
      if (!localStream) return;

      const engagementSocket = connectEngagementWebSocket();
      const chatSocket = connectChatWebSocket();

      intervalId = setInterval(() => {
        if (localVideoRef.current && engagementSocket.readyState === WebSocket.OPEN) {
          const base64Image = captureFrame(localVideoRef.current);
          if (base64Image) {
            engagementSocket.send(base64Image);
          } else {
            console.warn('Aucune image capturée pour l’envoi au WebSocket');
          }
        } else {
          console.warn('WebSocket engagement non connecté ou vidéo non disponible');
        }
      }, 10000);

      socket.on('connect', () => {
        socketIdRef.current = socket.id;
        console.log('Socket.IO connecté:', socket.id);
        socket.emit('join_call', { meeting_code, name: userName, role: userRole });
      });

      socket.on('user-joined', (data) => {
        const { sid, clients } = data;
        setParticipants(clients);
        if (sid !== socketIdRef.current && !peerConnections.current[sid]) {
          const pc = createPeerConnection(sid, localStream);
          initiateOffer(sid, pc);
        }
      });

      socket.on('user-left', (sid) => {
        cleanupPeerConnection(sid);
      });

      socket.on('signal', handleSignal);

      socket.on('engagement-prediction', ({ user, status }) => {
        console.log(`Engagement de ${user}: ${status}`);
        setEngagementStatus((prev) => ({ ...prev, [user]: status }));
      });
    });

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('connect_timeout');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('signal');
      socket.off('engagement-prediction');
      socket.disconnect();
      if (engagementSocketRef.current) {
        engagementSocketRef.current.close();
      }
      if (chatSocketRef.current) {
        chatSocketRef.current.close();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
      Object.keys(peerConnections.current).forEach(cleanupPeerConnection);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [meeting_code, navigate]);

  const copyRoomLink = () => {
    const link = `${window.location.origin}/call/${meeting_code}`;
    navigator.clipboard.writeText(link);
    setNotification('Lien de la réunion copié !');
    setTimeout(() => setNotification(''), 3000);
  };

  const sendMessage = () => {
    if (!message.trim()) {
      setNotification('Le message ne peut pas être vide.');
      setTimeout(() => setNotification(''), 3000);
      return;
    }
    if (chatSocketRef.current && chatSocketRef.current.readyState === WebSocket.OPEN) {
      const messageData = { message: message, username: userName };
      console.log('Envoi du message:', messageData);
      chatSocketRef.current.send(JSON.stringify(messageData));
      setMessage('');
    } else {
      setNotification('WebSocket chat non connecté. Reconnexion en cours...');
      console.warn('WebSocket chat non connecté, tentative de reconnexion');
      connectChatWebSocket();
      setTimeout(() => setNotification(''), 3000);
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
    if (engagementSocketRef.current) {
      engagementSocketRef.current.close();
    }
    if (chatSocketRef.current) {
      chatSocketRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate('/meetings');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial', background: '#f5f5f5' }}>
      <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        {notification && (
          <div
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#333',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '4px',
              zIndex: 1000,
            }}
          >
            {notification}
          </div>
        )}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Local video */}
          <div
            style={{
              position: 'relative',
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              border: userRole === 'enseignant' ? '3px solid #4caf50' : 'none',
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', color: 'white' }}>
              {userName} {engagementStatus[userName] && `(${engagementStatus[userName]})`}
            </div>
          </div>

          {/* Remote videos */}
          {videos.map((video) => {
            const participant = participants.find((p) => p.socketId === video.socketId);
            const participantName = participant
              ? participant.name
              : `Participant ${video.socketId.slice(0, 4)}`;
            const participantRole = participant ? participant.role : 'participant';

            return (
              <div
                key={video.socketId}
                style={{
                  position: 'relative',
                  background: '#000',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: participantRole === 'enseignant' ? '3px solid #4caf50' : 'none',
                }}
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
                  {participantName}{' '}
                  {engagementStatus[participantName] && `(${engagementStatus[participantName]})`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
              <span
                style={{
                  color: msg.isError
                    ? '#d32f2f'
                    : msg.text.startsWith(`${userName}:`)
                    ? '#1a73e8'
                    : '#333',
                }}
              >
                {msg.text}
              </span>
              {!msg.isError && msg.classification && (
                <span
                  style={{
                    color: msg.classification === 'confused' ? '#d32f2f' : '#4caf50',
                    marginLeft: '10px',
                  }}
                >
                  ({msg.classification}, {Math.round(msg.confidence * 100)}%)
                </span>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: '10px', borderTop: '1px solid #ddd', display: 'flex', gap: '10px' }}>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tapez un message..."
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button
            onClick={sendMessage}
            style={{
              padding: '8px 12px',
              background: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Envoyer
          </button>
        </div>
      </div>

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