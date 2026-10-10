# Reference: current schema SQL

Copies of the production schema files from the source system, in the state they were on 10 October 2026.
Shareholder names in the `schema.sql` seed have been replaced with placeholders. Nothing else was changed.

Apply order and what each file does: see ../../docs/03-data-model.md.

These are reference material for the SaaS rebuild, not something to run as-is: they have no tenant column,
no row-level security policies, and several tables grant everything to the anonymous role.
