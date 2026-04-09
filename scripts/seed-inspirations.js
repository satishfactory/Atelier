import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const USER_ID = 'satish'

const inspirations = [
  {
    title: 'Letters to Theo',
    creator: 'Vincent van Gogh',
    type: 'letters',
    intensity: 92,
    active: true,
    influence_note: 'Van Gogh writing to his brother as the only person who understood his work. The gap between what he sees and what the brush delivers. The refusal to stop.',
    linked_paintings: []
  },
  {
    title: 'The Poetics of Space',
    creator: 'Gaston Bachelard',
    type: 'book',
    intensity: 88,
    active: true,
    influence_note: 'Bachelard on how certain spaces — corners, nests, drawers — carry memory and shelter the imagination. Directly relevant to how I paint rooms and enclosures.',
    linked_paintings: []
  },
  {
    title: 'The Book of Disquiet',
    creator: 'Fernando Pessoa',
    type: 'book',
    intensity: 85,
    active: true,
    influence_note: "Pessoa's heteronyms and the idea of the self as multiple, contradictory, unresolved. Written in Lisbon. The city I paint from.",
    linked_paintings: []
  },
  {
    title: 'Edvard Munch: An Inner Life',
    creator: 'Sue Prideaux',
    type: 'book',
    intensity: 80,
    active: true,
    influence_note: 'How Munch turned personal collapse into a visual language that outlasted him. The question of when biography becomes painting.',
    linked_paintings: []
  },
  {
    title: 'Motion, Emotion and Empathy in Esthetic Experience',
    creator: 'Vittorio Gallese & David Freedberg',
    type: 'paper',
    intensity: 78,
    active: true,
    influence_note: 'Mirror neurons and embodied simulation — why we feel a painted gesture in our own body. The neuroscience behind why gesture matters in painting.',
    linked_paintings: []
  },
  {
    title: 'The Aesthetic Aha: Brain Activations During Aesthetic Appreciation',
    creator: 'Claudia Muth & Claus-Christian Carbon',
    type: 'paper',
    intensity: 74,
    active: true,
    influence_note: 'The moment of resolution that makes a complex image click into meaning. Directly relevant to how I use ambiguity and the figure emerging from ground.',
    linked_paintings: []
  },
  {
    title: 'Inner Vision: An Exploration of Art and the Brain',
    creator: 'Semir Zeki',
    type: 'book',
    intensity: 70,
    active: true,
    influence_note: "Zeki on the visual brain's search for constancy beneath surface variation. The biological basis for abstraction.",
    linked_paintings: []
  },
  {
    title: 'The Brain on Art: Intense Aesthetic Experience Activates the Default Mode Network',
    creator: 'Edward A. Vessel, Nava Starck & Semir Zeki',
    type: 'paper',
    intensity: 65,
    active: true,
    influence_note: 'Why works that resonate with personal memory and self-narrative hit differently. Explains the difference between admiring a painting and being changed by it.',
    linked_paintings: []
  },
  {
    title: 'A Model of Saliency-Based Visual Attention for Rapid Scene Analysis',
    creator: 'Laurent Itti & Christof Koch',
    type: 'paper',
    intensity: 60,
    active: true,
    influence_note: 'The computational basis for visual salience — what the eye is pulled toward before the mind engages. The Itti-Koch model underpins the salience scoring in ArtMind.',
    linked_paintings: []
  },
  {
    title: 'Memory Lane — Computational Analysis',
    creator: 'ArtMind (internal)',
    type: 'analysis',
    intensity: 55,
    active: true,
    influence_note: "The March 2026 evaluation series for Memory Lane. Three versions tracked over six weeks. The companion's reading of what changed between v1 and v3.",
    linked_paintings: ['satish_memory_lane']
  },
  {
    title: 'Computational Saliency — Style-Specific Evaluation Notes',
    creator: 'Unknown (research notes)',
    type: 'note',
    intensity: 48,
    active: true,
    influence_note: "Working notes on how saliency interacts with the artist's specific palette and compositional habits. Source unclear — possibly from the Praxis workshop materials.",
    linked_paintings: []
  },
]

console.log(`Inserting ${inspirations.length} inspirations for user: ${USER_ID}`)

const { data, error } = await supabase
  .from('inspirations')
  .insert(inspirations)
  .select('id, title')

if (error) {
  console.error('Insert error:', error.message)
  process.exit(1)
}

console.log(`✓ Inserted ${data.length} records:`)
data.forEach(r => console.log(`  ${r.id.slice(0, 8)}  ${r.title}`))
