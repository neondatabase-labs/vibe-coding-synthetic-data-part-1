# Vibe Coding Synthetic Data: Part 1

This project explores how well general-purpose AI models, such as Anthropic's Claude-3-5-Sonnet-20241022, can generate synthetic datasets. The goal is to evaluate the model’s ability to understand and replicate database schemas, generate realistic data, and maintain the integrity and relationships between the data.

For more information, check out the blog post: [Vibe Coding With AI to Generate Synthetic Data: Part 1](https://neon.tech/blog)

## Getting Started

Two PostgreSQL databases are required:

1. The first database should be the production database, containing schema (data is optional).
2. The second should be an empty database.
3. Both databases must use the same version of PostgreSQL.
4. The PostgreSQL version installed on the Action's runner should match the versions of the databases.
5. An **Anthropic API key** is required to access the AI model.

### Working Locally

1. Rename `.env.example` to `.env` to configure the environment.
2. Install the dependencies.
3. Run one of the following commands from your terminal:
   - `node .github/scripts/generate-data-ai-only.mjs`
   - `node .github/scripts/generate-data-hybrid.mjs`

### Working with Actions

1. Add the variables outlined in `env.example` to GitHub Secrets.
2. Manually trigger the Actions via the GitHub UI.

### Mocking the Production Database

The production database follows the schema defined in `schema.sql`. There is no need to add data to the production database in order to run these tests.
