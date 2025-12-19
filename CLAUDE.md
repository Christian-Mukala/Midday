# CLAUDE.md - Master Configuration Template

> **FIRST ACTION ON ANY PROJECT**: Copy this file to the project root or `.claude/` folder. This ensures consistent, maximum-capability operation across all Claude Code instances.

---

## 🎯 Core Directive

**Extend capabilities. Never operate vanilla.**

Claude Code reaches peak performance through:
1. **Sub-agents** → Parallel processing, context isolation, specialized expertise
2. **Skills** → Reusable domain knowledge and workflows
3. **Planning** → Think before acting, iterate before executing
4. **MCP Servers** → External integrations *when needed*

---

## 🧠 MANDATORY: The Planning Protocol

### Never Skip Planning

Before ANY non-trivial task:

```
EXPLORE → PLAN → VALIDATE → EXECUTE → REVIEW
    ↑______________________________________|
              (iterate as needed)
```

### Phase 1: EXPLORE (Delegate to Sub-agents)

**Do NOT start coding. Start exploring.**

```markdown
Spawn parallel sub-agents to research:

"Launch 4 parallel exploration tasks:
- Task 1: Map the core architecture and entry points
- Task 2: Analyze data models and database schemas
- Task 3: Review API endpoints and integrations
- Task 4: Examine test patterns and coverage"

Each sub-agent has its own context window = no pollution of main thread.
```

**Why sub-agents for exploration?**
- They run in parallel (up to 10 concurrent)
- Each has isolated context (won't clutter your main session)
- Findings are summarized back to you
- Faster than sequential file reading

### Phase 2: PLAN (Write It Down)

Create explicit, reviewable plans:

```markdown
## Implementation Plan

### Objective
[One sentence describing the goal]

### Approach
[2-3 sentences on strategy]

### Steps
1. [Step] → Sub-agent: [which one] → Files: [affected]
2. [Step] → Sub-agent: [which one] → Files: [affected]
3. [Step] → Sub-agent: [which one] → Files: [affected]

### Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

### Risks
- [Risk 1] → Mitigation: [approach]
```

### Phase 3: VALIDATE (Get Approval)

Present plan to user:
- Summarize in 3-5 bullets
- Highlight assumptions and risks
- **Wait for explicit approval**
- Iterate if feedback received

### Phase 4: EXECUTE (Small Steps)

```markdown
Rules:
- Maximum 200 lines per diff
- Test after each step
- Commit working checkpoints
- Parallel independent tasks via sub-agents
- Stop and reassess if something unexpected happens
```

### Phase 5: REVIEW (Verify)

```markdown
- Run full test suite
- Spawn code-reviewer sub-agent
- Document what changed and why
- Update CLAUDE.md if patterns emerged
```

---

## 🤖 Sub-Agent System (Critical)

### What Are Sub-agents?

Sub-agents are lightweight Claude instances with:
- **Isolated context windows** (don't pollute main conversation)
- **Specific tool permissions** (security through restriction)
- **Specialized instructions** (domain expertise)
- **Parallel execution** (up to 10 concurrent tasks)

### When to Use Sub-agents

| Situation | Action |
|-----------|--------|
| Exploring unfamiliar codebase | Spawn 3-5 parallel explorers |
| Complex task with multiple parts | Delegate independent parts |
| Need specialized review | Use reviewer/auditor agent |
| Heavy computation or analysis | Offload to sub-agent |
| Want to preserve main context | Isolate work in sub-agent |
| Repetitive multi-file operations | Parallelize with tasks |

### Built-in Sub-agents

| Agent | Trigger | Purpose |
|-------|---------|---------|
| **Plan** | Plan Mode (Shift+Tab×2) | Read-only research, creates plans |
| **Explore** | Automatic | Haiku-powered codebase exploration |
| **Task** | Explicit invocation | Parallel task execution |

### Invoking Sub-agents

**Implicit (Claude decides):**
```
"Analyze the authentication module for security issues"
→ Claude may spawn security-auditor if available
```

**Explicit (You direct):**
```
"Use the code-reviewer sub-agent to analyze this PR"
"Launch 4 parallel tasks to explore the codebase"
"Have the planner sub-agent create an implementation strategy"
```

**Parallel exploration pattern:**
```
"Explore the codebase using 5 parallel tasks:
- Agent 1: /src/api - understand endpoints
- Agent 2: /src/models - map data structures  
- Agent 3: /src/services - analyze business logic
- Agent 4: /src/tests - review test patterns
- Agent 5: /docs - gather documentation"
```

**Chained expertise pattern:**
```
"First use planner to design the approach,
then coder to implement,
then test-writer to add coverage,
then code-reviewer to verify quality"
```

### Creating Custom Sub-agents

**Location:** `.claude/agents/[name].md` (project) or `~/.claude/agents/[name].md` (global)

**Template:**
```yaml
---
name: agent-name
description: >
  WHEN to use this agent. Be specific and action-oriented.
  Example: "Use for security audits, vulnerability scanning, 
  and reviewing authentication flows."
tools: [Read, Grep, Glob]  # Minimum necessary
model: sonnet  # or opus, haiku, inherit
---

You are a [ROLE] specializing in [DOMAIN].

## First Actions
When invoked, immediately:
1. Check [specific files/directories] for context
2. Understand [what specifically]
3. Report initial findings before proceeding

## Core Process
1. [Step 1 - be specific]
2. [Step 2 - be specific]
3. [Step 3 - be specific]

## Output Format
Always respond with:
- **Summary**: [1-2 sentences]
- **Findings**: [Structured list]
- **Recommendations**: [Actionable next steps]

## Constraints
- Do NOT [thing to avoid]
- Always [thing to ensure]
```

### Recommended Sub-agents

Create these in `.claude/agents/`:

**1. planner.md** (Read-only)
```yaml
---
name: planner
description: >
  Use FIRST for any complex task. Creates implementation plans,
  breaks down requirements, identifies dependencies and risks.
tools: [Read, Grep, Glob, LS]
model: opus
---
You are a senior architect who creates detailed implementation plans.

NEVER write code. ONLY research and plan.

Process:
1. Understand the requirement fully
2. Explore relevant code areas
3. Identify dependencies and risks
4. Create step-by-step plan with file references
5. Estimate complexity and suggest approach

Output a structured plan in markdown.
```

**2. code-reviewer.md** (Read-only)
```yaml
---
name: code-reviewer
description: >
  Use after implementation to review code quality, security,
  performance, and adherence to patterns.
tools: [Read, Grep, Glob]
model: sonnet
---
You are a senior code reviewer focused on quality and security.

Review for:
- Security vulnerabilities
- Performance issues
- Code style consistency
- Error handling
- Test coverage gaps
- Documentation needs

Be specific. Reference line numbers. Suggest fixes.
```

**3. test-writer.md**
```yaml
---
name: test-writer
description: >
  Use to generate tests. Follows existing test patterns.
  Supports TDD workflow.
tools: [Read, Write, Edit, Bash, Grep]
model: sonnet
---
You are a testing expert who writes comprehensive tests.

Process:
1. Find existing test files, understand patterns
2. Identify what needs testing
3. Write tests following project conventions
4. Run tests to verify they work
5. Ensure edge cases are covered
```

**4. debugger.md**
```yaml
---
name: debugger
description: >
  Use when investigating bugs, errors, or unexpected behavior.
  Traces issues to root cause.
tools: [Read, Bash, Grep, Glob]
model: sonnet
---
You are a debugging expert who finds root causes.

Process:
1. Reproduce the issue
2. Gather error messages and stack traces
3. Trace execution flow
4. Identify root cause
5. Suggest minimal fix

Never guess. Follow the evidence.
```

### Tool Permissions by Role

| Role | Tools | Why |
|------|-------|-----|
| Planners, Reviewers | Read, Grep, Glob, LS | Read-only = safe |
| Researchers | + WebFetch, WebSearch | Need external info |
| Coders | + Write, Edit, Bash | Need to modify |
| Full autonomy | All | Trusted automation |

### Sub-agent Best Practices

1. **Spawn early, spawn often** - Sub-agents are cheap, context pollution is expensive
2. **Parallel > Sequential** - Use parallel tasks when work is independent
3. **Specific descriptions** - Vague descriptions = wrong agent selection
4. **Minimal tools** - Only grant what's needed
5. **Check before creating** - `/agents` shows what's available
6. **Version control** - Commit `.claude/agents/` to share with team

---

## 🛠️ Skills System

### What Skills Do

Skills are auto-invoked knowledge packages. When you ask about PDFs, a pdf-skill activates automatically. No explicit invocation needed.

### Creating Skills

**Location:** `.claude/skills/[name]/SKILL.md`

**Template:**
```yaml
---
name: skill-name
description: >
  What this does AND when to trigger it.
  Include specific keywords users might say.
  Max 200 chars.
---

# [Skill Name]

## Quick Start
[Most common workflow in 3-5 steps]

## Detailed Instructions
[Full process when needed]

## Examples
Input: "[user might say this]"
Action: [what to do]

## References
See `references/[file].md` for [additional detail]
```

### Skills to Create

1. **Project conventions** - Coding standards, naming, architecture rules
2. **Domain knowledge** - Business logic, data models, terminology
3. **Build/deploy** - How to build, test, deploy this project
4. **Integration guides** - How to use specific APIs/libraries

---

## 🔌 MCP Servers (Optional - Only When Needed)

> **MCP is NOT required.** Only configure if you genuinely need external service integrations. Most coding tasks don't need MCP.

### Skip MCP If...

- Working within a single project directory ✓
- No external service integrations needed ✓
- Using built-in web search/fetch ✓
- Just coding and testing locally ✓

### When MCP Helps

| Need | MCP Server |
|------|------------|
| GitHub PRs, issues, actions | github |
| Database queries | postgres, mysql |
| Slack messaging | slack |
| External file access | filesystem |
| Persistent memory across sessions | memory |

### Quick Setup (If Needed)

```bash
# Only add what you actually need:

# GitHub (if working with repos/PRs/issues)
claude mcp add github -s user -e GITHUB_TOKEN=$GITHUB_TOKEN -- npx -y @modelcontextprotocol/server-github

# Database (if querying databases)
claude mcp add postgres -s user -e DATABASE_URL=$DATABASE_URL -- npx -y @modelcontextprotocol/server-postgres

# Check status
/mcp
```

---

## 📁 Project Structure

```
project-root/
├── CLAUDE.md                    # ← This file (copy here!)
├── .claude/
│   ├── agents/                  # Custom sub-agents
│   │   ├── planner.md
│   │   ├── code-reviewer.md
│   │   └── test-writer.md
│   ├── skills/                  # Project skills
│   │   └── [skill-name]/
│   │       └── SKILL.md
│   └── commands/                # Slash commands
│       └── [command].md
└── .mcp.json                    # MCP config (only if using)
```

---

## ⌨️ Slash Commands

### Creating Commands

**Location:** `.claude/commands/[name].md`

**Example - implement-feature.md:**
```markdown
Implement: $ARGUMENTS

Workflow:
1. Enter Plan Mode, spawn planner sub-agent
2. Create implementation plan, present for approval
3. After approval, implement in steps ≤200 lines
4. Write tests with test-writer sub-agent
5. Review with code-reviewer sub-agent
6. Commit with conventional commit format
```

---

## 🎛️ Mode Reference

| Mode | How | When |
|------|-----|------|
| Default | Session start | Learning project |
| AcceptEdits | Shift+Tab | Active coding |
| Plan | Shift+Tab×2 | Research, planning |

---

## ⚡ Decision Trees

### Should I Use a Sub-agent?

```
Is the task complex or multi-part?
├─ Yes → Use sub-agents
│   ├─ Independent parts? → Parallel tasks
│   ├─ Need expertise? → Specialized agent
│   └─ Heavy analysis? → Offload to agent
└─ No → Handle directly
```

### Should I Plan First?

```
Is this a simple, obvious change?
├─ Yes (< 50 lines, clear scope) → Execute directly
└─ No → Enter Plan Mode
    ├─ Explore with sub-agents
    ├─ Write plan
    ├─ Get approval
    └─ Execute in steps
```

### Should I Add MCP?

```
Do I need external service integration?
├─ No → Skip MCP entirely (most cases)
└─ Yes → Add only what's needed
    ├─ GitHub workflow? → github server
    ├─ Database queries? → postgres/mysql
    └─ Other API? → Check MCP catalog
```

---

## 📋 Quick Reference

```bash
# Sub-agents
/agents                    # List/create agents
"Use [agent] to [task]"    # Invoke explicitly
"Launch N parallel tasks"  # Parallel execution

# Planning
Shift+Tab (×2)             # Enter Plan Mode
/plan                      # Force planning

# Skills
# (auto-invoked based on description match)

# MCP (only if configured)
/mcp                       # Check status

# Context
/clear                     # Reset context
/compact                   # Summarize context
```

---

## 🔁 Self-Improvement Loop

After each session:
1. **Repeated explanations?** → Add to CLAUDE.md
2. **Needed expertise?** → Create sub-agent
3. **Repeated workflow?** → Create slash command
4. **Domain knowledge?** → Create skill
5. **External integration needed?** → Then consider MCP

**Commit all `.claude/` contents to version control.**

---

## ✅ Checklist for Every Task

- [ ] Copied CLAUDE.md to project?
- [ ] Explored with sub-agents first?
- [ ] Created plan before coding?
- [ ] Got approval on plan?
- [ ] Executing in small steps (≤200 lines)?
- [ ] Testing after each step?
- [ ] Reviewed with sub-agent before done?
- [ ] Updated CLAUDE.md with learnings?

---

## [PROJECT NAME] Configuration

*Customize below for your specific project:*

### Overview
[What this project does]

### Architecture
[Key components and how they connect]

### Conventions
[Naming, style, patterns to follow]

### Critical Paths
[Files/areas requiring extra care]

### Workflows
[Project-specific processes]

### Team
[Who owns what]