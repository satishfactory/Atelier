import { useRef, useState } from 'react'
import { updateStory, friendlyError } from '../lib/supabase'
import { useVoiceInput, MicButton } from '../lib/useVoiceInput.jsx'

const FIELDS = [
  ['title',        'Title'],
  ['trip',         'Trip'],
  ['location',     'Location'],
  ['travel_dates', 'Dates'],
  ['mood',         'Mood'],
  ['artistic_ref', 'Artistic Reference'],
  ['philosophical','Philosophical Thread'],
  ['sensory',      'Sensory Details'],
  ['moment_type',  'Moment Type'],
  ['audio_url',    'Audio URL'],
  ['video_url',    'Video URL'],
]

const INPUT_STYLE = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
  padding: '7px 12px', borderRadius: 'var(--radius-sm)',
  border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
}

export default function StoryIntakeForm({ story, onSave }) {
  const [fields, setFields] = useState(() => {
    const f = { raw_notes: story.raw_notes || '' }
    FIELDS.forEach(([k]) => { f[k] = story[k] || '' })
    return f
  })
  const [saving, setSaving] = useState(false)
  const notesRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()

  function set(key) { return e => setFields(prev => ({ ...prev, [key]: e.target.value })) }

  async function save() {
    setSaving(true)
    try { await updateStory(story.slug, fields); onSave?.(fields) }
    catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {FIELDS.map(([key, label]) => (
        <div key={key}>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
          <input value={fields[key]} onChange={set(key)} style={INPUT_STYLE} />
        </div>
      ))}

      <div>
        <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Raw Notes</p>
        <div style={{ position: 'relative' }}>
          <textarea ref={notesRef} className="upload-textarea" rows={6}
            value={fields.raw_notes} onChange={set('raw_notes')}
            placeholder="Voice transcription, bullet notes, anything…"
            style={{ paddingRight: 52 }} />
          <MicButton onClick={() => toggleVoice(
            v => setFields(prev => ({ ...prev, raw_notes: v })), notesRef
          )} listening={listening} />
        </div>
      </div>

      <button className="btn" style={{ alignSelf: 'flex-start' }}
        onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
