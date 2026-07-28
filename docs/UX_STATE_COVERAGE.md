# Merchant portal UX state coverage

The merchant shell now provides consistent cross-page states while individual
pages retain their domain-specific empty and save states.

| State | Coverage |
|---|---|
| Loading | Authentication, outlet lookup, and workspace data use semantic skeleton states before any page renders. Settings and reports retain local loading states. |
| Empty | Dashboard, Schedule, POS catalog, Members, Menu, Sales History, Sales Reports, Staff, and report views show deliberate empty copy instead of blank containers. |
| Error | Workspace data failures stop page rendering and offer a reload action. Local Settings, Staff, Reports, and form errors remain inline. |
| Offline | Every authenticated page receives the shared offline banner and a temporary recovery confirmation. |
| Permission denied | Missing outlet access uses a semantic permission-denied screen. Role-based navigation and existing feature locks remain unchanged. |
| Save success | POS, Members, Menu, Sales History, Staff, and Settings show completion or saved feedback after write actions. Read-only report and dashboard views do not display irrelevant save states. |

The state layer is presentation-only. It does not change Firebase/Supabase
queries, permissions, calculations, routes, or write handlers.
