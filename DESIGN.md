# DESIGN.MD

## Creative Operating System (COS)

---

# 1. Product Intent

COS is a **workflow-first creative system**.

It is designed to help teams move from:

```text
unclear input → aligned direction → executable output → iterative refinement
```

The system does not prioritize generation.

It prioritizes:

* clarity
* structure
* decision-making
* iteration

---

# 2. Core Mental Model

The product is a **pipeline with memory**.

```text
Brief → Direction → Production → Review → Export
```

Each stage:

* consumes structured input
* produces structured output
* can be revisited without breaking downstream work

---

# 3. Interaction Model

## 3.1 Primary Loop

Every interaction follows:

```text
User action → System response → State update → Visible consequence
```

There are no dead actions.

Every action must:

* change state
* produce output
* or move the workflow forward

---

## 3.2 Forward Momentum

The system should always answer:

```text
“What should I do next?”
```

Rules:

* Each stage exposes **one primary action**
* Secondary actions are always visually de-emphasized
* The system surfaces a **recommended next step**

---

## 3.3 Reversibility

Users must be able to:

* revisit earlier stages
* regenerate outputs
* iterate without losing context

Constraint:

* previous outputs are versioned, not overwritten

---

# 4. Layout Logic

## 4.1 Spatial Roles

```text
Left → Navigation & context
Center → Work surface
Right → System state & feedback
```

Each region has a fixed responsibility.

No duplication across regions.

---

## 4.2 Center Surface

The center is not a dashboard.

It is:

> the current stage of thinking

Only one stage is “active” at a time.

---

## 4.3 Pipeline Visibility

The pipeline is always visible.

Purpose:

* orient the user
* communicate progress
* allow direct navigation

---

# 5. Stage Design

## 5.1 Brief

Purpose:

* transform raw input into structured understanding

Behavior:

* user inputs are parsed
* system highlights:

  * insight
  * risk
  * missing information

Success condition:

* user trusts the interpretation

---

## 5.2 Direction

Purpose:

* generate multiple strategic paths

Behavior:

* outputs are presented as **parallel options**
* not ranked by default
* user selects one or compares

Constraint:

* must feel like decisions, not suggestions

---

## 5.3 Production

Purpose:

* turn direction into executable assets

Behavior:

* outputs are grouped by type:

  * hooks
  * scripts
  * visuals
  * shot lists

Constraint:

* outputs must be structured and reusable

---

## 5.4 Review

Purpose:

* evaluate quality before use

Behavior:

* system provides critique
* user can refine outputs

Constraint:

* critique must be actionable, not vague

---

## 5.5 Export

Purpose:

* move work out of the system

Behavior:

* outputs are bundled into formats:

  * internal (execution)
  * external (client-facing)

---

# 6. Feedback System

## 6.1 Quick Feedback

Users can apply directional changes:

```text
more premium
less generic
more playful
```

Behavior:

* feedback modifies outputs, not inputs
* changes are localized and traceable

---

## 6.2 Iteration Integrity

Rules:

* feedback should not reset the system
* outputs evolve, not restart

---

# 7. Agent Behavior

Agents are invisible operators.

They should feel like:

> system capabilities, not separate entities

Avoid:

* over-anthropomorphizing agents
* chat-style interaction

---

# 8. Information Density

The system is intentionally dense.

Rules:

* prioritize scannability over whitespace
* group related information tightly
* avoid unnecessary visual separation

---

# 9. Visual Behavior

## 9.1 Emphasis

Only these elements receive emphasis:

* primary action
* active stage
* selected option
* system alerts

Everything else remains neutral.

---

## 9.2 Motion

Motion is used to:

* communicate state changes
* reinforce cause → effect

Never decorative.

---

# 10. System Feedback

The system must always communicate:

```text
what happened
what changed
what to do next
```

---

# 11. Failure States

Failures must:

* be explicit
* suggest next steps

Avoid:

* silent failure
* generic errors

---

# 12. Constraints

* No feature exists without a clear stage mapping
* No output exists without structure
* No action exists without visible consequence

---

# 13. Non-Goals

* Not a design tool
* Not a content generator
* Not a collaboration-first product

---

# 14. Success Criteria

The system succeeds when:

```text
Users move from unclear brief → actionable system in minutes
Users trust outputs enough to act
Users iterate instead of restarting
```

---
