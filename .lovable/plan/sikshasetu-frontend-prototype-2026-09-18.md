# SIKSHASETU Frontend Prototype

## Goal
Build a fully navigable, frontend-only EdTech prototype that makes learning differences visible without ranking or stigmatizing learners. All experiences use synthetic data and replaceable mock services.

## Experience structure
- **Public landing page:** premium product story, adaptive-learning flow, learner comparison story, role preview switcher, and clear demo entry points.
- **Student experience:** personalized onboarding, adaptive diagnostic with varied question types and simulated difficulty changes, learning profile, subject/topic drill-down, targeted practice, completion state, and progress history.
- **Teacher experience:** high-density classroom workspace centered on the Class Learning Map, class/subject drill-down, searchable learner matrix, individual evidence profiles, intervention groups, Adaptive Mastery Index, and assessment setup wizard.
- **Parent experience:** calm, reassuring learning journey with progress, subject trends, milestones, recent activity, and areas to strengthen.

## Build approach
- Establish a refined midnight, indigo, mint, and warm-neutral design system with editorial typography, accessible contrast, stable layouts, and restrained motion.
- Add shared shells and reusable controls for navigation, buttons, status indicators, charts, progress, tables, dialogs, and responsive mobile navigation.
- Centralize typed synthetic learners, skills, assessments, intervention groups, and practice recommendations behind mock service interfaces.
- Create clean routes for each major view so every demo action has a working destination.
- Use local UI state for onboarding, assessment answers, adaptive transitions, filters, wizard progress, assignments, and practice completion.
- Include explicit synthetic-data and role-permission messaging throughout the relevant views.

## Validation
- Verify all primary Student, Teacher, and Parent paths in the running preview.
- Check desktop and mobile layouts, keyboard focus, dialogs, answer flows, filters, and route transitions.
- Confirm every content route has unique product metadata and no major action is inert.

## Scope boundary
No authentication service, database, AI model, adaptive algorithm, statistical scoring, or backend will be added. Demo login and personalization remain local mock interactions designed for later service replacement.
