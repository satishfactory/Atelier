import { useRef, useState } from 'react'

export function useVoiceInput() {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)

  function toggleVoice(setMsg, textareaRef) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      textareaRef?.current?.focus()
      if (!sessionStorage.getItem('mic_hint_shown')) {
        sessionStorage.setItem('mic_hint_shown', '1')
        const isIos = /iPhone|iPad/i.test(navigator.userAgent)
        const msg = isIos
          ? 'Tap the 🎙 key on your iOS keyboard to dictate.'
          : 'Voice input is not supported in this browser. Try Chrome, or type your note.'
        setTimeout(() => alert(msg), 300)
      }
      return
    }
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-US'
    rec.onresult = e => {
      let newText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) newText += e.results[i][0].transcript + ' '
      }
      if (newText.trim()) setMsg(prev => prev ? prev + ' ' + newText.trim() : newText.trim())
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recognitionRef.current = rec
    setListening(true)
  }

  return { listening, toggleVoice }
}

export function MicButton({ onClick, listening }) {
  return (
    <button onClick={onClick}
      style={{ position: 'absolute', right: 8, bottom: 8, width: 44, height: 44, borderRadius: '50%',
        border: 'none', background: listening ? 'var(--warm)' : 'var(--stone)',
        color: listening ? 'var(--white)' : 'var(--dark)', fontSize: 18, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      🎙
    </button>
  )
}

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  // Prefer natural-sounding male English voices (macOS/iOS premium voices first)
  const preferred = ['Daniel', 'Tom', 'Alex', 'Gordon', 'Oliver', 'Aaron', 'Fred']
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
    if (v) return v
  }
  return voices.find(v => v.lang.startsWith('en')) || null
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)

  function speak(text) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate  = 0.88
    utt.pitch = 0.85
    utt.onstart = () => setSpeaking(true)
    utt.onend   = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)

    const doSpeak = () => {
      const voice = pickVoice()
      if (voice) utt.voice = voice
      window.speechSynthesis.speak(utt)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length) {
      doSpeak()
    } else {
      // Chrome loads voices async on first call
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null
        doSpeak()
      }
    }
  }

  function stop() { window.speechSynthesis?.cancel(); setSpeaking(false) }
  return { speaking, speak, stop }
}

export function SpeakButton({ text, speaking, onSpeak, onStop }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  if (!supported) return null
  return (
    <button onClick={speaking ? onStop : () => onSpeak(text)}
      title={speaking ? 'Stop' : 'Listen'}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
        color: speaking ? 'var(--warm)' : 'var(--text-muted)', padding: '2px 6px',
        lineHeight: 1, flexShrink: 0 }}>
      {speaking ? '⏹' : '🔊'}
    </button>
  )
}
