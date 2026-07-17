import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Circle, Cloud, Hash, MapPin, MessageCircle, Mic, MicOff, Plug, Radio, Send, UserPlus, Users } from "lucide-react";
import type { PlayerProfile } from "../types/profile";

type Props = {
  profile: PlayerProfile;
  isAdmin?: boolean;
  defaultRelayUrl?: string;
  defaultRoom?: string;
  onBack: () => void;
};

type ChatEvent = {
  id: string;
  type: "message" | "presence" | "audio";
  userId: string;
  userName: string;
  text?: string;
  audio?: string;
  mimeType?: string;
  createdAt: string;
};

const relayUrlKey = "rpg-platform.cloud-relay-url.v1";
const sessionRoomKey = "rpg-platform.lan-session-room.v1";

const channels = [
  { id: "general", label: "general", group: "Mesa RPG" },
  { id: "voz", label: "voz-de-sesion", group: "Mesa RPG" },
  { id: "soporte", label: "soporte", group: "Asistencia" },
  { id: "mapas", label: "mapas-y-campanas", group: "Creadores" },
];

const friends = [
  { id: "ana", name: "Ana", status: "online", location: "Bogota, Colombia" },
  { id: "leo", name: "Leo", status: "playing", location: "Madrid, Espana" },
  { id: "max", name: "Max", status: "offline", location: "Buenos Aires, Argentina" },
];

function readLocalStorage(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage can be blocked in restricted shells.
  }
}

function normalizeRelayUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

function encodeChunk(chunk: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(chunk);
  });
}

export function ChatScreen({ profile, isAdmin = false, defaultRelayUrl = "http://localhost:8787", defaultRoom = "mesa-rpg", onBack }: Props) {
  const [relayUrl, setRelayUrl] = useState(() => readLocalStorage(relayUrlKey, defaultRelayUrl));
  const [room, setRoom] = useState(() => readLocalStorage(sessionRoomKey, defaultRoom));
  const [activeChannelId, setActiveChannelId] = useState("general");
  const [userLocation, setUserLocation] = useState("Bogota, Colombia");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatEvent[]>([]);
  const [message, setMessage] = useState("");
  const [micEnabled, setMicEnabled] = useState(false);
  const [micError, setMicError] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const normalizedRelay = useMemo(() => normalizeRelayUrl(relayUrl), [relayUrl]);
  const userName = profile.username || profile.name || profile.id;

  useEffect(() => {
    audioRef.current = new Audio();
    return () => {
      eventSourceRef.current?.close();
      stopMic();
    };
  }, []);

  function persistConnection() {
    writeLocalStorage(relayUrlKey, normalizedRelay);
    writeLocalStorage(sessionRoomKey, room.trim() || defaultRoom);
  }

  function connect() {
    persistConnection();
    eventSourceRef.current?.close();
    const targetRoom = encodeURIComponent(room.trim() || defaultRoom);
    const source = new EventSource(`${normalizedRelay}/events?room=${targetRoom}&userId=${encodeURIComponent(profile.id)}&userName=${encodeURIComponent(userName)}`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ChatEvent;
        if (payload.type === "audio" && payload.userId !== profile.id && payload.audio) {
          playRemoteAudio(payload.audio);
          return;
        }
        setMessages((current) => [payload, ...current].slice(0, 80));
      } catch {
        // Ignore malformed relay events.
      }
    };
    eventSourceRef.current = source;
    postEvent("presence", `${userName} se conecto.`);
  }

  function disconnect() {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setConnected(false);
    void stopMic();
  }

  async function postEvent(type: ChatEvent["type"], text?: string, audio?: string, mimeType?: string) {
    if (!normalizedRelay) return;
    await fetch(`${normalizedRelay}/${type === "audio" ? "audio" : "message"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room: room.trim() || defaultRoom,
        userId: profile.id,
        userName,
        type,
        text,
        audio,
        mimeType,
      }),
    }).catch(() => setConnected(false));
  }

  function sendMessage() {
    const text = message.trim();
    if (!text) return;
    setMessage("");
    void postEvent("message", text);
  }

  async function startMic() {
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      recorder.ondataavailable = async (event) => {
        if (!event.data.size || !connected) return;
        const audio = await encodeChunk(event.data);
        await postEvent("audio", undefined, audio, event.data.type || "audio/webm");
      };
      recorder.start(900);
      recorderRef.current = recorder;
      setMicEnabled(true);
    } catch {
      setMicError("No se pudo activar el microfono. Revisa permisos del navegador y HTTPS/localhost.");
      setMicEnabled(false);
    }
  }

  async function stopMic() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setMicEnabled(false);
  }

  function playRemoteAudio(audio: string) {
    const player = audioRef.current ?? new Audio();
    player.src = audio;
    void player.play().catch(() => undefined);
  }

  const activeChannel = channels.find((channel) => channel.id === activeChannelId) ?? channels[0];
  const onlineFriends = friends.filter((friend) => friend.status !== "offline").length + (connected ? 1 : 0);

  return (
    <section className="screen-panel chat-screen">
      <div className="screen-heading chat-heading">
        <div>
          <h2><MessageCircle size={34} /> Chat en linea</h2>
          <p>{isAdmin ? "Canales, grupos, amigos, ubicacion y relay cloud para sesiones activas." : "Chat por canales, amigos conectados y voz de sesion sin configurar LAN."}</p>
        </div>
        <button onClick={onBack}>Volver</button>
      </div>

      <div className="discord-chat-shell">
        <aside className="discord-server-rail">
          <button className="selected">RPG</button>
          <button>F4</button>
          <button>WH</button>
          <button>D&D</button>
        </aside>

        <aside className="discord-channel-panel">
          <div className="discord-server-title">
            <strong>{room || defaultRoom}</strong>
            <span>{onlineFriends} conectados</span>
          </div>
          {["Mesa RPG", "Asistencia", "Creadores"].map((group) => (
            <section key={group}>
              <small>{group}</small>
              {channels.filter((channel) => channel.group === group).map((channel) => (
                <button key={channel.id} className={channel.id === activeChannelId ? "selected" : ""} onClick={() => setActiveChannelId(channel.id)}>
                  <Hash size={16} /> {channel.label}
                </button>
              ))}
            </section>
          ))}
          <div className="discord-cloud-card">
            <Cloud size={18} />
            <strong>Cloud relay</strong>
            <span>{connected ? "Sincronizado" : "Listo para conectar"}</span>
          </div>
        </aside>

        <article className="discord-main-chat">
          <header>
            <div>
              <strong><Hash size={18} /> {activeChannel.label}</strong>
              <span>{messages.length} eventos - {connected ? "online" : "offline"}</span>
            </div>
            <div className="discord-top-actions">
              <button className="green-button" onClick={connect}><Plug size={16} /> Conectar cloud</button>
              <button onClick={disconnect}>Salir</button>
            </div>
          </header>

          <div className="discord-message-list">
            {messages.map((entry) => (
              <section key={entry.id} className={entry.userId === profile.id ? "own" : ""}>
                <span>{entry.userName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <strong>{entry.userName}<small>{new Date(entry.createdAt).toLocaleTimeString()}</small></strong>
                  <p>{entry.text}</p>
                </div>
              </section>
            ))}
            {messages.length === 0 && (
              <div className="discord-empty">
                <MessageCircle size={34} />
                <strong>Bienvenido a #{activeChannel.label}</strong>
                <span>Conecta el relay cloud y empieza la conversacion de la sesion.</span>
              </div>
            )}
          </div>

          <footer>
            <button className={micEnabled ? "danger-button" : ""} disabled={!connected} onClick={() => (micEnabled ? void stopMic() : void startMic())}>
              {micEnabled ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") sendMessage(); }} placeholder={`Mensaje para #${activeChannel.label}`} />
            <button className="green-button" disabled={!connected || !message.trim()} onClick={sendMessage}><Send size={18} /></button>
          </footer>
          {micError && <strong className="chat-error">{micError}</strong>}
        </article>

        <aside className="discord-member-panel">
          <section className="discord-card">
            <div className="admin-panel-title compact">
              <strong><Cloud size={18} /> Conexion cloud</strong>
              <span className={connected ? "admin-status-pill" : "admin-status-pill amber"}>{connected ? "Online" : "Offline"}</span>
            </div>
            {isAdmin ? (
              <>
                <label><span>Endpoint cloud</span><input value={relayUrl} onChange={(event) => setRelayUrl(event.target.value)} placeholder="https://relay.tu-dominio.com" /></label>
                <label><span>Sala por defecto</span><input value={room} onChange={(event) => setRoom(event.target.value)} placeholder={defaultRoom} /></label>
              </>
            ) : (
              <p>La plataforma usa el endpoint cloud configurado por el administrador. No necesitas IP local ni LAN.</p>
            )}
          </section>

          <section className="discord-card">
            <div className="admin-panel-title compact">
              <strong><Users size={18} /> Amigos</strong>
              <button><UserPlus size={16} /> Agregar</button>
            </div>
            <div className="discord-friend-list">
              {friends.map((friend) => (
                <span key={friend.id}>
                  <Circle size={10} className={`friend-${friend.status}`} />
                  <strong>{friend.name}</strong>
                  <small>{friend.status === "playing" ? "En partida" : friend.status === "online" ? "Online" : "Offline"}</small>
                </span>
              ))}
            </div>
          </section>

          <section className="discord-card discord-world-card">
            <div className="admin-panel-title compact">
              <strong><MapPin size={18} /> Mapamundo</strong>
            </div>
            <div className="world-map-preview">
              <i style={{ left: "28%", top: "54%" }} />
              <i style={{ left: "48%", top: "38%" }} />
              <i style={{ left: "36%", top: "68%" }} />
            </div>
            <label><span>Tu ubicacion</span><input value={userLocation} onChange={(event) => setUserLocation(event.target.value)} /></label>
          </section>

          <section className="discord-card">
            <div className="admin-panel-title compact">
              <strong><Radio size={18} /> Voz</strong>
              <span className={micEnabled ? "admin-status-pill" : "admin-status-pill amber"}>{micEnabled ? "Activa" : "Apagada"}</span>
            </div>
            <p>Usa auriculares para evitar eco. La voz usa fragmentos cortos sobre el relay cloud.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
