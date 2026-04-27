with atlas_project as (
  insert into projects (slug, name, description, client_name, status)
  values (
    'atlas',
    'Project Atlas — Q3 Launch',
    'Reposition the flagship product line for a new generation. Functional honesty meets quiet personality.',
    'Atlas Line',
    'active'
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    client_name = excluded.client_name,
    status = excluded.status
  returning id
), raw_brief as (
  insert into project_inputs (project_id, type, content)
  select
    id,
    'brief',
    'We are launching the next iteration of the Atlas line for a generation that values functional honesty over status signaling. The product needs to feel quietly distinctive — recognizable without shouting. Channel mix is heavy on social and partnerships, with a tight 8-week window from kickoff to first wave. We have no confirmed budget for paid amplification, which constrains the strategy. Past launches over-indexed on aspirational lifestyle imagery, which did not translate to conversion. The team wants to lean into product-led storytelling this time.'
  from atlas_project
  returning project_id
), brief_output as (
  insert into outputs (project_id, stage, type, title, content, version, status)
  select
    id,
    'brief',
    'brief_intelligence',
    'Brief Intelligence',
    jsonb_build_object(
      'audience', 'A new generation of utility-minded buyers',
      'core_insight', 'The audience values functional honesty over status signaling.',
      'opportunity', 'Turn product details, organization, and durability into the campaign story.',
      'risks', jsonb_build_array('The 8-week window is aggressive', 'No confirmed paid amplification budget', 'Aspirational lifestyle imagery has underperformed'),
      'missing_information', jsonb_build_array('Confirmed media budget', 'Priority channels by market', 'Final product feature list'),
      'recommended_next_step', 'Generate distinct creative territories rooted in product-led storytelling.'
    ),
    1,
    'approved'
  from atlas_project
  returning project_id
), territory_outputs as (
  insert into outputs (project_id, stage, type, title, content, version, status)
  select
    id,
    'direction',
    'territory',
    territory.title,
    territory.content,
    1,
    territory.status
  from atlas_project,
  lateral (
    values
      (
        'Quiet Utility',
        jsonb_build_object(
          'name', 'Quiet Utility',
          'description', 'Elevate the everyday. Soft, tactile, organized.',
          'strategic_angle', 'Make functional restraint feel like confidence.',
          'visual_language', 'Tactile details, organized interiors, calm product-led framing.',
          'tone', 'Confident, restrained, specific',
          'manifesto', 'Atlas is what happens when the everyday gets serious about itself. We do not sell the lifestyle around the product — we sell the product, and let the lifestyle take care of itself.',
          'best_channels', jsonb_build_array('TikTok', 'Meta', 'Retail partner content'),
          'potential', 'high',
          'risk', 'low',
          'distinctiveness', 'high'
        ),
        'selected'
      ),
      (
        'Carry Your Calm',
        jsonb_build_object(
          'name', 'Carry Your Calm',
          'description', 'A bag that moves with your rhythm, not against it.',
          'strategic_angle', 'Position organization as emotional ease.',
          'visual_language', 'Movement, soft transitions, hands-free everyday flow.',
          'tone', 'Warm, mobile, reassuring',
          'manifesto', 'Movement is not a feature — it is the whole point. We show people in motion, and the bag becoming part of the motion, not fighting it.',
          'best_channels', jsonb_build_array('TikTok', 'Instagram Reels'),
          'potential', 'high',
          'risk', 'medium',
          'distinctiveness', 'medium'
        ),
        'draft'
      ),
      (
        'Pocket, Perfected',
        jsonb_build_object(
          'name', 'Pocket, Perfected',
          'description', 'The carry system that solves the bag-rummage problem nobody admits to.',
          'strategic_angle', 'Make interior organization the hero feature.',
          'visual_language', 'Cutaways, pocket callouts, satisfying before/after organization.',
          'tone', 'Precise, useful, slightly playful',
          'manifesto', 'We obsess over the inside. Every pocket has a job, every job has a name. The bag becomes a system you can rely on — and brag about.',
          'best_channels', jsonb_build_array('TikTok', 'YouTube Shorts', 'Product page'),
          'potential', 'medium',
          'risk', 'low',
          'distinctiveness', 'high'
        ),
        'draft'
      )
  ) as territory(title, content, status)
  returning id, project_id, status
), selected_territory as (
  update projects p
  set selected_territory_id = t.id
  from territory_outputs t
  where p.id = t.project_id and t.status = 'selected'
  returning p.id
), stage_updates as (
  update workflow_stages ws
  set status = case
    when ws.stage = 'brief' then 'complete'
    when ws.stage = 'direction' then 'complete'
    when ws.stage = 'production' then 'idle'
    else ws.status
  end,
  summary = case
    when ws.stage = 'brief' then 'Brief intelligence seeded for demo project.'
    when ws.stage = 'direction' then 'Three starter territories seeded; Quiet Utility selected.'
    else ws.summary
  end
  from atlas_project p
  where ws.project_id = p.id
  returning ws.project_id
)
insert into activity_events (project_id, type, message, metadata)
select id, 'seed', 'Project Atlas demo data seeded', jsonb_build_object('slug', 'atlas')
from atlas_project;
