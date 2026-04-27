# BUILD_PLAN.md

## Creative Operating System — 3–5 Day Prototype

---

# Day 1 — Foundation

## Goal

Build the app shell and make the product feel real before AI is added.

## Tasks

```txt
Create Next.js app
Install Tailwind + shadcn/ui
Set up Supabase project
Run database schema
Create app layout
Build project workspace UI
Seed one fake project
Seed fake outputs/activity
```

## Screens

```txt
/projects
/projects/[projectId]
```

## Components

```txt
Sidebar
ProjectHeader
Pipeline
StageWorkspace
RightSystemPanel
ActivityFeed
AgentStatus
OutputCard
```

## Done When

```txt
A user can open a project page
The UI shows pipeline, outputs, activity, and agent panel
No AI required yet
```

---

# Day 2 — Project Intake + Brief Intelligence

## Goal

User can create a project, paste a messy brief, and generate structured brief intelligence.

## Tasks

```txt
Create project form
Create project input form
Save raw brief to project_inputs
Build OpenAI client
Create Brief Intelligence Agent
Validate structured JSON output
Save output to outputs
Log agent_run
Log activity_event
Update brief stage to complete
```

## Agent

```txt
brief_intelligence
```

## Done When

```txt
User pastes brief
Clicks Parse Brief
System returns audience, insight, opportunity, risks, missing info
Output persists after refresh
```

---

# Day 3 — Creative Territories

## Goal

User can generate and select strategic campaign directions.

## Tasks

```txt
Create Creative Director Agent
Generate 3–4 territories from brief intelligence
Save each territory as output
Display territory cards
Allow user to select territory
Save selected_territory_id on project
Update direction stage to complete
Log activity_event
```

## Agent

```txt
creative_director
```

## Done When

```txt
User generates territories
Territories are meaningfully distinct
User selects one
Production stage unlocks
```

---

# Day 4 — Production System + Feedback

## Goal

Selected territory becomes executable creative production materials.

## Tasks

```txt
Create Copywriter Agent
Create Art Director Agent
Create Production Planner Agent
Generate hooks/scripts
Generate visual direction/prompts
Generate shot list
Save outputs
Build outputs feed
Create feedback action buttons
Create Feedback Engine
Version revised outputs
Log feedback_events
```

## Agents

```txt
copywriter
art_director
production_planner
feedback_engine
```

## Done When

```txt
User selects territory
Clicks Generate Production System
Receives hooks, scripts, visual prompts, shot list
Clicks Less Generic / More Premium
New version is created
Old version remains preserved
```

---

# Day 5 — QA + Export + Polish

## Goal

Make the prototype demo-ready.

## Tasks

```txt
Create QA Critic Agent
Review selected output
Generate scores/issues/fixes
Create Markdown export
Build export preview
Polish empty/loading/error states
Add demo project data
Improve visual hierarchy
Add retry buttons for failed runs
```

## Agents

```txt
qa_critic
export_agent
```

## Done When

```txt
User can complete the full demo path
Export produces usable Markdown
Activity feed reflects every action
UI feels polished enough for interview demo
```

---

# Required Demo Path

```txt
1. Create project
2. Paste messy client brief
3. Generate brief intelligence
4. Generate territories
5. Select territory
6. Generate production system
7. Review output
8. Apply “less generic”
9. Export markdown handoff
```

---

# Technical Priorities

## Must Have

```txt
Persistent database
Structured AI outputs
Agent run logging
Output versioning
Activity feed
Feedback loop
Markdown export
```

## Nice To Have

```txt
Image upload
Vision summaries
PDF export
Animated loading states
Project templates
```

## Avoid

```txt
Figma integration
Adobe integration
Team permissions
Realtime collaboration
Overbuilt auth
Autonomous agents
```

---

# Interview Framing

Present it as:

```txt
An internal AI workflow prototype for creative teams.

The goal is not to replace creative judgment.
The goal is to turn messy inputs into structured, reviewable, reusable creative systems.
```
