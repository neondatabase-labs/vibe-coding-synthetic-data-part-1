import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';

(async () => {
  try {
    const schemaDump = await fs.readFile('schema.sql', 'utf8');
    console.log('Schema file read successfully');

    const totalRows = 10;
    console.log(`Create ${totalRows} rows of data`);

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    console.log('Calling Anthropic API...');

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      system:
        'You are a seasoned database administrator responsible for generating realistic test data while maintaining referential integrity.',
      messages: [
        {
          role: 'user',
          content: `
              I have a database schema below. Your task is to generate test data with strict adherence to referential integrity:

              Data Generation Requirements:
              1. Generate exactly ${totalRows} rows of data for each parent table, respecting uniqueness and referential integrity.
              2. Ensure that the generated code:
                  - Generates rows based on the schema provided below.
                  - Ensures uniqueness where applicable (such as user emails, IDs, etc.).
                  - Handles relationships between parent and child tables (e.g., foreign keys).
              3. The output should **only contain SQL statements** for INSERTING the rows.

              IMPORTANT NOTE:
               - Ensure all email addresses are UNIQUE across all generated rows
              - For any foreign key relationships (like transactions.user_id referencing users.id):
                * Only use IDs that were successfully inserted in previous tables
                * Track which IDs were successfully inserted and only reference those
              - Insert tables in the correct order: first parent tables (like users), then child tables (like transactions)
              - All table references MUST be fully qualified with the schema name, like 'public.users', 'public.products', etc.
              - There should be no extra text, explanations, code fences, or headings in the response. For examples lines that include -- Insert or -- ...(continue).

              Database Schema:
              ${schemaDump}

              Please generate exactly ${totalRows} rows for each table based on the schema.
          `,
        },
      ],
    });

    const cleanSql = msg.content[0].text.replace(/\\n/g, ' ');
    console.log(cleanSql);
    fs.writeFile('./data.sql', cleanSql);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
