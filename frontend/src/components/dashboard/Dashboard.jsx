// Helper to detect PDF link in AI response
function extractPdfUrl(text) {
  // If backend returns a fileUrl, it should be in the response object, not just text
  // But if text contains a URL, extract it
  const urlRegex = /(https?:\/\/[^\s]+\.pdf)/i;
  const match = text && text.match(urlRegex);
  return match ? match[1] : null;
}
  // Generate PDF from content and show download link in chat
  const generatePdfAndShowLink = async (content) => {
    setAiTyping(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('not_authenticated');
      const token = await user.getIdToken();
      const base = import.meta.env.VITE_API_URL_BASE || 'http://localhost:4000';
      const url = `${base}/api/generate-pdf`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err && err.error ? JSON.stringify(err.error) : 'pdf_generation_failed');
      }
      const data = await resp.json();
      if (data.success && data.fileUrl) {
        setMessages(m => [...m, { role: 'ai', text: `PDF generated: ${data.fileUrl}`, pdfUrl: data.fileUrl }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: 'PDF generated but no link returned.' }]);
      }
    } catch (err) {
      setMessages(m => [...m, { role: 'ai', text: 'Error generating PDF', sources: [], emotion: 'neutral' }]);
    } finally {
      setAiTyping(false);
    }
  };
import React, { useState, useEffect, useRef } from 'react';
import './dashboard.css';
import TopBar from './TopBar';
import DocumentPanel from './DocumentPanel';
import ChatWindow from './ChatWindow';
import MessageInput from './MessageInput';
import { getAIResponse, handleSpeak, stopSpeaking } from './utils';
import { auth } from '../../firebase/firebase';


export default function Dashboard() {
  const [documents, setDocuments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const base = import.meta.env.VITE_API_URL_BASE || 'http://localhost:4000';
        const url = `${base}/api/documents/list`;
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) throw new Error('failed_to_fetch_documents');
        const data = await resp.json();
        if (data.success && Array.isArray(data.documents)) {
          setDocuments(data.documents.map(doc => ({
            id: doc.docId || doc._id,
            name: doc.fileName || doc.title,
            size: doc.size || 0
          })));
        }
      } catch (err) {
        console.error('fetchDocuments error', err);
      }
    };
    fetchDocuments();
  }, []);
  const [processing, setProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef();
  const [messages, setMessages] = useState([]);
  const [aiTyping, setAiTyping] = useState(false);
  const [voiceOutput, setVoiceOutput] = useState(false);
  const [sessionId, setSessionId] = useState(() => localStorage.getItem('docvoice_sessionId') || null);

  // Handle voice output toggle
  const handleVoiceOutputToggle = (enabled) => {
    if (!enabled) {
      // Stop any ongoing speech when toggling off
      stopSpeaking();
    }
    setVoiceOutput(enabled);
  };

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const uploadDocument = async (file) => {
    setProcessing(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('not_authenticated');
      const token = await user.getIdToken();
      const base = import.meta.env.VITE_API_URL_BASE || 'http://localhost:4000';
      const url = `${base}/api/documents/upload`;
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('title', file.name);
      const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err && err.error ? JSON.stringify(err.error) : 'upload_failed');
      }
      const data = await resp.json();
      const doc = { id: data.docId || Date.now().toString(), name: data.fileName || file.name, size: file.size };
      setDocuments(d => [doc, ...d]);
    } catch (err) {
      console.error('uploadDocument error', err);
      const doc = { id: Date.now().toString(), name: file.name, size: file.size };
      setDocuments(d => [doc, ...d]);
    } finally {
      setProcessing(false);
    }
  }

  const deleteDocument = async (id) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('not_authenticated');
      const token = await user.getIdToken();
      const base = import.meta.env.VITE_API_URL_BASE || 'http://localhost:4000';
      const url = `${base}/api/documents/${id}`;
      const resp = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>null);
        throw new Error(err && err.error ? JSON.stringify(err.error) : 'delete_failed');
      }
      setDocuments(d => d.filter(x => x.id !== id));
    } catch (err) {
      console.error('deleteDocument error', err);
      // Optionally show error to user
    }
  }

  // Store sessionId in localStorage when it changes
  useEffect(() => {
    if (sessionId) localStorage.setItem('docvoice_sessionId', sessionId);
  }, [sessionId]);

  // On initial mount, rehydrate chat from backend if sessionId exists
  useEffect(() => {
    let ignore = false;
    const rehydrateChat = async () => {
      const storedSessionId = localStorage.getItem('docvoice_sessionId');
      // console.log('[Rehydrate] sessionId in localStorage:', storedSessionId);
      if (!storedSessionId) {
        // console.log('[Rehydrate] No sessionId found in localStorage.');
        return;
      }
      try {
        const user = auth.currentUser;
        if (!user) {
          // console.log('[Rehydrate] No authenticated user.');
          return;
        }
        const token = await user.getIdToken();
        const base = import.meta.env.VITE_API_URL_BASE || 'http://localhost:4000';
        const url = `${base}/api/query/session/${storedSessionId}`;
        // console.log('[Rehydrate] Fetching session messages from:', url);
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!resp.ok) {
          // console.error('[Rehydrate] Failed to fetch session:', resp.status);
          throw new Error('failed_to_fetch_session');
        }
        const data = await resp.json();
        // console.log('[Rehydrate] Data received from backend:', data);
        if (!ignore && Array.isArray(data.messages)) {
          const mapped = data.messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => ({ 
              role: m.role === 'assistant' ? 'ai' : 'user', 
              text: m.content,
              emotion: m.emotion || 'neutral',
              sources: m.sources || []
            }));
          // console.log('[Rehydrate] Setting messages:', mapped);
          setMessages(mapped);
        } else {
          // console.log('[Rehydrate] No messages array in backend response.');
        }
      } catch (err) {
        if (!ignore) console.error('[Rehydrate] Error:', err);
      }
    };
    rehydrateChat();
    return () => { ignore = true; };
  }, []);

  // New Chat handler
  const handleNewChat = () => {
    setMessages([]);
    setSessionId(null);
    localStorage.removeItem('docvoice_sessionId');
  };

  const sendMessage = async (text) => {
    setMessages(m => [...m, { role: 'user', text }]);
    setAiTyping(true);
    try {
      const res = await getAIResponse(text, undefined, sessionId);
      setAiTyping(false);
      // If AI response includes a PDF link, show a download link
      if (res && res.text && extractPdfUrl(res.text)) {
        setMessages(m => [...m, { role: 'ai', text: res.text, pdfUrl: extractPdfUrl(res.text), sources: res.sources, emotion: res.emotion }]);
      } else {
        setMessages(m => [...m, { role: 'ai', text: res.text, sources: res.sources, emotion: res.emotion }]);
      }
      if (!sessionId && res.sessionId) setSessionId(res.sessionId);
      if (voiceOutput) { handleSpeak(res.text); }
    } catch (err) {
      setAiTyping(false);
      setMessages(m => [...m, { role: 'ai', text: 'Error generating response', sources: [], emotion: 'neutral' }]);
    }
  };

  // Voice recording logic
  const onStartVoice = async () => {
    if (isRecording || isProcessingVoice) return;
    setIsRecording(true);
    setRecordingTime(0);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new window.MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessingVoice(true);
        clearInterval(recordingTimerRef.current);
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], 'voice-query.webm', { type: 'audio/webm' });
          await sendVoiceQuery(file);
        } catch (err) {
          setMessages(m => [...m, { role: 'ai', text: 'Error processing voice input', sources: [], emotion: 'neutral' }]);
        }
        setIsProcessingVoice(false);
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
      };
      mediaRecorder.start();
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
      // Auto-stop after 30s
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, 30000);
    } catch (err) {
      setIsRecording(false);
      setMessages(m => [...m, { role: 'ai', text: 'Microphone permission denied or unavailable.', sources: [], emotion: 'neutral' }]);
    }
  };

  const onStopVoice = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  // Send voice query to backend
  const sendVoiceQuery = async (audioFile) => {
    setAiTyping(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('not_authenticated');
      const token = await user.getIdToken();
      const form = new FormData();
      form.append('file', audioFile);
      if (sessionId) {
        form.append('sessionId', sessionId);
      }
      const url = 'http://localhost:4000/api/query/voice';
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err && err.error ? JSON.stringify(err.error) : 'voice_query_failed');
      }
      const data = await resp.json();
      // Debug: log backend data
      console.log('Voice backend response:', data);
      // Show transcribed text as user message, then AI response
      const userText = (typeof data.text === 'string' && data.text.trim().length > 0)
        ? data.text.trim()
        : '[Voice Query]';
      setMessages(m => [
        ...m,
        { role: 'user', text: userText, sources: [], emotion: data.emotion || 'neutral' },
        { role: 'ai', text: data.answer || '', emotion: data.emotion || 'neutral', sources: data.sources || [] }
      ]);
      if (!sessionId && data.sessionId) setSessionId(data.sessionId);
      if (voiceOutput && data.answer) handleSpeak(data.answer);
    } catch (err) {
      setMessages(m => [...m, { role: 'ai', text: 'Error processing voice input', sources: [], emotion: 'neutral' }]);
    } finally {
      setAiTyping(false);
    }
  };

  return (
    <div className="dashboard-root">
      <TopBar />
      <div className="main-area">
        <DocumentPanel documents={documents} onUpload={uploadDocument} onDelete={deleteDocument} processing={processing} />
        <div className="right-col">
          <div className="chat-area">
            <button className="new-chat-tab" onClick={handleNewChat} title="New chat">
              <span className="new-chat-icon">+</span>
              <span className="sr-only">New Chat</span>
            </button>
            <ChatWindow
              messages={messages}
              aiTyping={aiTyping || isProcessingVoice}
              renderPdfLink={msg => msg.pdfUrl ? (
                <div style={{ marginTop: 8 }}>
                  <a href={msg.pdfUrl} target="_blank" rel="noopener noreferrer" className="pdf-download-link">
                    📄 Download PDF
                  </a>
                </div>
              ) : null}
            />
          <MessageInput
            onSend={sendMessage}
            onStartVoice={onStartVoice}
            onStopVoice={onStopVoice}
            isRecording={isRecording}
            recordingTime={recordingTime}
            voiceOutput={voiceOutput}
            setVoiceOutput={handleVoiceOutputToggle}
            isProcessingVoice={isProcessingVoice}
          />
          </div>
        </div>
      </div>
    </div>
  );
}
