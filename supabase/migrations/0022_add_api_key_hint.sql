-- Feedback vom Dev-Professor: in den Settings soll man den hinterlegten
-- API-Key an ein paar sichtbaren Zeichen wiedererkennen koennen, ohne den
-- vollen (verschluesselten) Key je wieder im Klartext zu zeigen.
alter table public.api_keys
  add column if not exists key_hint text;
