---
trigger: always_on
description: Consult the graphify knowledge graph at graphify-out/ for codebase and architecture questions.
---

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- **Session Start**: Refresh and read reflections by running `graphify reflect --if-stale` and checking `graphify-out/reflections/LESSONS.md` to load preferred sources, dead ends, and prior corrections.
- **Codebase Queries**: For codebase or architecture questions, when `graphify-out/graph.json` exists, first run `graphify query "<question>"` (CLI) or `query_graph` (MCP). Use `graphify path "<A>" "<B>"` / `shortest_path` for relationships and `graphify explain "<concept>"` / `get_node` for focused concepts. These return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output.
- **Feedback Loop (Session End)**: After answering a query, save the result to the graph's memory using `graphify save-result --question "Q" --answer "A" --type query|path_query|explain --nodes N1 N2 --outcome useful|dead_end|corrected`.
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost).
