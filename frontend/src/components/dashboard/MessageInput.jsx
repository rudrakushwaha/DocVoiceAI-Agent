import React, {useState} from 'react';
import './dashboard.css';

export default function MessageInput({onSend, onStartVoice, onStopVoice, isRecording, recordingTime, voiceOutput, setVoiceOutput, isProcessingVoice}){
  const [text, setText] = useState('');
  const submit = ()=>{ if(text.trim()==='') return; onSend(text); setText(''); }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    // Allow Shift+Enter for new line
  };
  
  return (
    <div className="input-area">
      <textarea 
        className="textbox" 
        value={text} 
        onChange={(e)=>setText(e.target.value)} 
        onKeyPress={handleKeyPress}
        placeholder="Ask something about your documents..." 
        disabled={isRecording || isProcessingVoice}
      />
      <button className="icon-btn" title={isRecording ? "Stop Recording" : "Voice"} onClick={isRecording ? onStopVoice : onStartVoice} style={isRecording ? {background:'#f87171',color:'var(--text)',boxShadow:'0 0 8px #ef4444'} : {}}>
        {isRecording ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#fff" stroke="#ef4444" strokeWidth="2"/></svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 1v11" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 11a7 7 0 01-14 0" stroke="#374151" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </button>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {isRecording && <div style={{color:'var(--text)',fontWeight:500}}>Recording... {recordingTime}s</div>}
        {isProcessingVoice && <div style={{color:'var(--text)',fontWeight:500}}>Processing voice…</div>}
        <label className="toggle" style={{display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
          <span style={{fontSize: '14px'}}>Voice Output</span>
          <input type="checkbox" checked={voiceOutput} onChange={(e)=>setVoiceOutput(e.target.checked)} />
          <span style={{fontSize: '12px', color: voiceOutput ? '#10b981' : '#6b7280'}}>
            {voiceOutput ? 'ON' : 'OFF'}
          </span>
        </label>
        <button className="send-btn" onClick={submit} title="Send" disabled={isRecording || isProcessingVoice}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2l-7 20 1-7 7-13z" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  )
}


