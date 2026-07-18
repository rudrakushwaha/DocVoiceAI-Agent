import React from 'react';
import './dashboard.css';

const EMOJI = {
  neutral: '😐',
  happy: '😊',
  sad: '😔',
  angry: '😠',
  frustrated: '�',
  confused: '😕',
  excited: '😃'
};

export default function EmotionIndicator({emotion}){
  return (
    <div style={{display:'inline-flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:18}}>{EMOJI[emotion] || 'neutral'}</span>
      <span style={{fontSize:12,color:'var(--muted)'}}>
        Emotion detected: <strong style={{marginLeft:6}}>{emotion}</strong>
      </span>
    </div>
  )
}
