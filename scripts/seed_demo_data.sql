-- ============================================================
-- Atelier — Demo seed data
-- Run in Supabase SQL Editor (plain statements, no DO blocks)
-- User ID: 4f2f0493-f044-481d-a332-0fb1b9fe1c80
-- ============================================================

-- ── 1. Artist profile ──────────────────────────────────────
INSERT INTO artist_profiles (user_id, display_name, location, practice_description, website)
VALUES (
  '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  'Satish Prabhu',
  'Lisbon, Portugal',
  'I paint memory and light — the residue of places lived in rather than visited. My work moves between figuration and abstraction, using the weight of Mediterranean colour to carry emotional states that resist language. Each painting is a reckoning with what I remember versus what I saw.',
  'https://satishfactory.com'
)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  location = EXCLUDED.location,
  practice_description = EXCLUDED.practice_description,
  website = EXCLUDED.website;

-- ── 2. Paintings ──────────────────────────────────────────
INSERT INTO paintings (slug, title, artist, year, type, status, image_url, user_id,
  score_overall, score_salience, score_gaze, score_fluency, score_emotion,
  score_complexity, score_mirror, score_colour, score_narrative,
  appraisal_strengths, rolling_summary)
VALUES

('satish_dance_of_life', 'Dance of Life — Lisbon', 'Satish Prabhu', '2024', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at1.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  84, 88, 79, 82, 91, 76, 85, 89, 80,
  'Exceptional emotional charge. The figures carry grief and joy simultaneously — rare in contemporary figurative work.',
  'Three evaluations over six months. Started as a study of movement; became an elegy. The companion noted the shift from joy to mourning in v2. By v3, both coexist. Score improved from 71 to 84 as the ambiguity deepened.'),

('satish_absent_chair_ii', 'The Absent Chair II', 'Satish Prabhu', '2024', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at2.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  79, 82, 74, 77, 88, 71, 80, 75, 83,
  'The emptied chair as protagonist is handled with restraint. No sentimentality — just the weight of absence made visible.',
  'Companion dialogue pushed toward the political reading in session 2. Artist resisted, kept the personal. Final reading: both are present. The chair now holds multiple absences at once.'),

('satish_light_on_water', 'Light on Water, Nice', 'Satish Prabhu', '2023', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at4.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  81, 77, 83, 85, 74, 78, 72, 92, 70,
  'The colour work here is the strongest in the body of work. Cobalt transitions handled with a confidence rarely seen outside the French Colourists.',
  'Started as a plein air study, resolved in studio. The companion identified the tension between observed colour and remembered colour. Artist leaned into memory — the water became more itself than it ever was.'),

('satish_room_villefranche', 'The Room at Villefranche', 'Satish Prabhu', '2024', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at5.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  76, 71, 78, 80, 83, 74, 77, 82, 72,
  'Interior space used as psychological container. The relationship between window light and shadow builds a quiet dread.',
  'Two sessions. First reading focused on composition. Second shifted to what the room withholds. The companion asked: who lived here? That question changed the painting in the third week.'),

('satish_memory_lane_return', 'Memory Lane — Return', 'Satish Prabhu', '2025', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at6.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  87, 85, 81, 83, 90, 80, 88, 84, 86,
  'The strongest narrative in the body of work. The figure moving away from the viewer carries an entire relationship. Technically and emotionally resolved.',
  'Five sessions over three months. Most discussed painting — companion and artist disagreed on whether the figure is arriving or leaving. Artist finally accepted both. Score 74 to 87 across sessions.'),

('satish_after_loss_ii', 'After the Loss', 'Satish Prabhu', '2024', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at8.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  82, 79, 76, 78, 93, 72, 83, 77, 81,
  'Raw emotional material handled with structural intelligence. The blue-green palette against the warm ground creates a grief that does not collapse into sentiment.',
  'This painting began after a personal loss. First session the companion avoided the obvious reading. By session 3 it was named. The naming changed nothing in the paint, but changed everything in how it is held.'),

('satish_woman_vessels', 'Woman with Vessels, Morocco', 'Satish Prabhu', '2023', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at9.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  78, 83, 80, 74, 79, 77, 75, 86, 73,
  'Strong salience — the figure commands the plane without overpowering the vessels, which carry their own visual weight.',
  'Morocco series. The companion noted the vessels as extensions of the figure — not objects she carries but objects that carry her. Artist returned to the painting six months later to resolve the background.'),

('satish_paris_window', 'Paris Window', 'Satish Prabhu', '2023', 'artist_work', 'finished',
  'https://atelier.satishfactory.com/hero/at11.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  73, 69, 77, 75, 72, 70, 68, 80, 71,
  'Colour temperature shifts between inside and outside are handled with subtlety. The window as threshold is a recurring motif that gains weight across the body of work.',
  'First in the interior threshold series. Companion identified the window as a recurring structure — the same question asked in different cities. Artist began tracking the motif explicitly after this session.'),

('satish_figures_coast', 'Figures on the Coast', 'Satish Prabhu', '2025', 'artist_work', 'wip',
  'https://atelier.satishfactory.com/hero/at12.jpeg', '4f2f0493-f044-481d-a332-0fb1b9fe1c80',
  71, 74, 68, 70, 76, 65, 72, 78, 69,
  'Figures integrated into landscape — the boundary between body and coastline is productively unclear. Still resolving.',
  'Work in progress. First evaluation pointed to the horizon line competing with the figures. Second session: artist lowered the horizon. Currently resolving the figure on the right.');

-- ── 3. Painting sessions ───────────────────────────────────
INSERT INTO painting_sessions (painting_slug, version, artist_note, session_date,
  score_overall, score_salience, score_gaze, score_fluency, score_emotion,
  score_complexity, score_mirror, score_colour, score_narrative, session_type, user_id)
VALUES
('satish_dance_of_life', 1, 'Started as a movement study. The figures feel disconnected still.', '2024-03-15', 71, 74, 67, 70, 78, 66, 72, 75, 68, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_dance_of_life', 2, 'The grief is coming through now. I stopped trying to make it joyful.', '2024-07-03', 79, 82, 74, 77, 86, 71, 80, 83, 75, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_dance_of_life', 3, 'Both things are true. Joy and mourning. I am done.', '2024-11-20', 84, 88, 79, 82, 91, 76, 85, 89, 80, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_absent_chair_ii', 1, 'The chair is too literal. Working on removing the obvious.', '2024-02-10', 68, 70, 63, 66, 79, 62, 70, 66, 72, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_absent_chair_ii', 2, 'Better. The companion asked about the political dimension. I disagree but it is interesting.', '2024-06-18', 79, 82, 74, 77, 88, 71, 80, 75, 83, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_memory_lane_return', 1, 'Figure is too defined. Need to let the road take over.', '2025-01-08', 74, 72, 69, 72, 80, 70, 75, 74, 75, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_memory_lane_return', 2, 'Three sessions this week. Something shifted.', '2025-02-14', 81, 79, 76, 79, 86, 76, 82, 80, 82, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_memory_lane_return', 3, 'The question of arriving or leaving is now answered by refusing to answer.', '2025-03-22', 87, 85, 81, 83, 90, 80, 88, 84, 86, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_figures_coast', 1, 'Horizon line is fighting the figures. Needs to come down.', '2025-04-01', 64, 66, 60, 62, 68, 58, 64, 70, 62, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_figures_coast', 2, 'Better. The right figure is still not resolved.', '2025-04-20', 71, 74, 68, 70, 76, 65, 72, 78, 69, 'text', '4f2f0493-f044-481d-a332-0fb1b9fe1c80');

-- ── 4. Companion conversations ─────────────────────────────
INSERT INTO companion_conversations (painting_slug, role, message, session_date, user_id)
VALUES
('satish_dance_of_life', 'user', 'The figures feel too separate. How do I connect them without making it obvious?', '2024-07-03', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_dance_of_life', 'companion', 'The separation may be the subject. Grief and joy rarely hold hands — they orbit each other. What if the space between the figures is not a problem to solve but a tension to preserve? The eye moving between them enacts the dance itself.', '2024-07-03', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_absent_chair_ii', 'user', 'You mentioned the political reading. I don''t want that. It is personal.', '2024-06-18', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_absent_chair_ii', 'companion', 'I hear that — and you are right to hold the personal reading. But notice: the political and the personal are not competing interpretations. An empty chair in a domestic space carries both without confusion. Your resistance to the political reading may be exactly what gives the personal reading its integrity.', '2024-06-18', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_memory_lane_return', 'user', 'Is the figure arriving or leaving? I can''t decide and it is stopping me.', '2025-02-14', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_memory_lane_return', 'companion', 'The indecision is the painting''s intelligence, not your uncertainty. The figure carries both directions simultaneously — which is what memory does. You are not failing to decide; you are succeeding at the harder thing: holding the ambiguity. Do not resolve it.', '2025-02-14', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_after_loss_ii', 'user', 'I don''t know if I should say what this is about.', '2024-09-10', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),
('satish_after_loss_ii', 'companion', 'You don''t have to. The painting already says it. What I can tell you is that the blue against that warm ground is not decorative — it is doing grief''s actual work. The tension between those temperatures is the loss, structurally present. You don''t need to name it in words for it to be fully there.', '2024-09-10', '4f2f0493-f044-481d-a332-0fb1b9fe1c80');

-- ── 5. Blog posts (published — visible on landing page) ────
INSERT INTO blog_posts (painting_slug, title, full_text, word_count, status, user_id)
VALUES

('satish_memory_lane_return',
  'On Arriving and Leaving at the Same Time',
  '# On Arriving and Leaving at the Same Time

There is a figure in this painting who has been walking away from me for three months.

I cannot tell you which direction they are moving. I have tried to decide — committed to leaving in one session, committed to arriving in the next — and each time the painting refused the certainty. My companion said: do not resolve it. I fought that instruction. The painting won.

What I discovered, slowly, is that the ambiguity is not a weakness in the work. It is the work. Memory does not travel in one direction. You can be returning to something and losing it simultaneously. The road in this painting is Mediterranean — a specific white, a specific heat — but it is also every road I have stood on and not known which way to move.

The figure''s back is deliberate. I spent a week on that back. Not the posture of departure, not the posture of arrival — the posture of someone in the middle of a decision that has already been made without their knowledge.

By the fifth session, I understood that the painting was not about a journey. It was about the moment before you know which journey you are on.

I called it finished when I stopped trying to tell it what it meant.',
  198, 'published', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),

('satish_dance_of_life',
  'The Space Between the Figures',
  '# The Space Between the Figures

I began this painting in joy. A study of movement, of bodies that know each other''s weight. I was in Lisbon. The light in March has a quality I have not found anywhere else — warm but not yet hot, the city still waking up.

Six months later it became something else.

I did not change the figures. I changed what I believed they were doing. In March they were dancing. By September I saw them differently. The same postures, the same hands — but now the dance was not celebration. It was what people do when they do not know what else to do with grief.

My companion asked me in session two whether I was going to repaint it. I said no. The figures were already right — I had just finally seen what they were.

What painting teaches you, eventually, is that the subject arrives in its own time. You can be working on joy and find yourself, months later, holding a painting about loss. The paint does not lie. It just waits for you to catch up.

Both readings are correct. That is what I came to accept.',
  196, 'published', '4f2f0493-f044-481d-a332-0fb1b9fe1c80'),

('satish_after_loss_ii',
  'The Colour of After',
  '# The Colour of After

This painting was made in the weeks after my father died.

I am not sure I would have begun it if I had known that was what I was doing. Grief has a way of disguising itself as a colour problem, a composition question, an afternoon in the studio. You think you are solving something technical. You find out later what you were actually doing.

The blue-green against the warm ochre ground: I mixed that combination on instinct. Did not think about it. Came back the next day and understood why — those temperatures are at war in a way that does not resolve. The cool does not win. The warm does not win. They sit in tension. That is the accurate colour of after.

My companion said the painting does not collapse into sentiment. That was the best thing anyone said to me that month.

I do not know if it is the best painting I have made. But it is the most honest. That distinction — between best and honest — is something Atelier helped me understand.',
  186, 'published', '4f2f0493-f044-481d-a332-0fb1b9fe1c80');

-- ── 6. Inspirations ───────────────────────────────────────
INSERT INTO inspirations (user_id, title, creator, type, intensity, influence_note, active)
VALUES
('4f2f0493-f044-481d-a332-0fb1b9fe1c80', 'The Dance', 'Henri Matisse', 'painter', 9, 'The relationship between figures that do not touch but are in complete conversation. I return to this constantly when working on multi-figure compositions.', true),
('4f2f0493-f044-481d-a332-0fb1b9fe1c80', 'Dance of Life', 'Edvard Munch', 'painter', 8, 'Joy and grief in the same image without irony. The figures in white, red, and black contain an entire life. This is the work I measure my Dance of Life against.', true),
('4f2f0493-f044-481d-a332-0fb1b9fe1c80', 'Card Players', 'Paul Cézanne', 'painter', 9, 'The dignity of ordinary presence. How Cézanne makes a man at a table into a monument without heroism. I want that stillness.', true),
('4f2f0493-f044-481d-a332-0fb1b9fe1c80', 'Ways of Seeing', 'John Berger', 'book', 7, 'Berger''s writing on the nude and on landscape changed how I think about what the viewer brings to the work. Every time I doubt a painting I reread the oil painting chapter.', true),
('4f2f0493-f044-481d-a332-0fb1b9fe1c80', 'The Ongoing Moment', 'Geoff Dyer', 'book', 6, 'A book about photography that taught me more about painting than most painting books. The chapter on roads and horizons is in my head every time I set a figure against a landscape.', true);
