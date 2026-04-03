# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

This is a **Claude Code skill** (not an application). It provides expert React Flow (`@xyflow/react` v12+) guidance that Claude Code uses automatically when helping users build node-based UIs. The skill is installed via `npx skills add framara/react-flow-skill`.

## Repository Structure

- `SKILL.md` — The skill definition file. Contains the agent behavior contract (12 rules), triage template, routing map, common pitfalls, and verification checklist. This is the entry point Claude Code reads when the skill activates.
- `references/` — 14 topic-specific reference files that SKILL.md routes to based on user needs (migration, fundamentals, custom nodes/edges, state management, layouting, TypeScript, performance, troubleshooting, E2E testing, advanced patterns, common recipes, etc.)
- No build system, tests, or application code — this repo is purely markdown-based reference content.

## Editing Guidelines

- **SKILL.md is the contract**: Any behavioral rules, pitfall patterns, or verification steps belong here. Keep it concise — it's loaded into context on every activation.
- **References are the depth**: Detailed code examples, API patterns, and implementation guides go in `references/*.md`. SKILL.md's routing map must stay in sync with reference file contents.
- When adding a new reference topic: create `references/<topic>.md`, add a routing entry in SKILL.md's "Routing map" section, and list it in SKILL.md's "References" section and README.md's feature list.
