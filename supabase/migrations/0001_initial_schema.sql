create extension if not exists "pgcrypto";

create table projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  description text,
  client_name text,
  status text not null default 'active' check (status in ('active', 'archived')),
  selected_territory_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_inputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('brief', 'note', 'url', 'image', 'document')),
  content text,
  asset_url text,
  asset_summary text,
  created_at timestamptz not null default now()
);

create table workflow_stages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  stage text not null check (stage in ('brief', 'direction', 'production', 'review', 'export')),
  status text not null default 'idle' check (status in ('idle', 'in_progress', 'needs_review', 'complete', 'failed')),
  summary text,
  updated_at timestamptz not null default now(),
  unique(project_id, stage)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  agent_type text not null check (
    agent_type in (
      'brief_intelligence',
      'creative_director',
      'copywriter',
      'art_director',
      'production_planner',
      'qa_critic',
      'export_agent',
      'feedback_engine'
    )
  ),
  stage text not null check (stage in ('brief', 'direction', 'production', 'review', 'export')),
  status text not null default 'pending' check (status in ('pending', 'running', 'complete', 'failed')),
  input jsonb,
  output jsonb,
  error text,
  model text,
  duration_ms int,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  agent_run_id uuid references agent_runs(id) on delete set null,
  parent_output_id uuid references outputs(id) on delete set null,
  stage text not null check (stage in ('brief', 'direction', 'production', 'review', 'export')),
  type text not null check (
    type in (
      'brief_intelligence',
      'territory',
      'copy_system',
      'visual_direction',
      'shot_list',
      'prompt_pack',
      'qa_review',
      'export_doc'
    )
  ),
  title text not null,
  content jsonb not null,
  version int not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'selected', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table projects
add constraint fk_selected_territory
foreign key (selected_territory_id)
references outputs(id)
on delete set null;

create table feedback_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  output_id uuid not null references outputs(id) on delete cascade,
  feedback_type text not null,
  instruction text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null,
  message text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_projects_slug on projects(slug);
create index idx_project_inputs_project_id on project_inputs(project_id);
create index idx_workflow_stages_project_id on workflow_stages(project_id);
create index idx_agent_runs_project_id on agent_runs(project_id);
create index idx_outputs_project_id on outputs(project_id);
create index idx_outputs_parent_output_id on outputs(parent_output_id);
create index idx_feedback_events_project_id on feedback_events(project_id);
create index idx_activity_events_project_id on activity_events(project_id);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
before update on projects
for each row execute function set_updated_at();

create trigger workflow_stages_updated_at
before update on workflow_stages
for each row execute function set_updated_at();

create trigger outputs_updated_at
before update on outputs
for each row execute function set_updated_at();

create or replace function create_default_workflow_stages()
returns trigger as $$
begin
  insert into workflow_stages (project_id, stage, status)
  values
    (new.id, 'brief', 'idle'),
    (new.id, 'direction', 'idle'),
    (new.id, 'production', 'idle'),
    (new.id, 'review', 'idle'),
    (new.id, 'export', 'idle')
  on conflict (project_id, stage) do nothing;

  return new;
end;
$$ language plpgsql;

create trigger create_project_stages
after insert on projects
for each row execute function create_default_workflow_stages();
