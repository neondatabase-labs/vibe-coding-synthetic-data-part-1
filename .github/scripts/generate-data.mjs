import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';

(async () => {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const schemaDump = await fs.readFile('schema.sql', 'utf8');
    console.log('Schema file read successfully');

    const totalRows = 1000;
    const startId = 1;
    const endId = totalRows;

    console.log(`Generating ${totalRows} rows for parent tables...`);

    // Clear existing data file
    await fs.writeFile('./data.sql', '');

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
              1. Identify Parent Tables
                - Tables that are referenced by foreign keys but don't have foreign keys to other tables
                - These tables MUST be populated first and in a way that supports child table generation

              2. Data Generation Specifications:
                - Generate EXACTLY ${totalRows} rows for each parent table
                - Use sequential IDs from ${startId} to ${endId}
                - CRITICAL: Ensure data maintains potential foreign key relationships
                  * For tables that might be referenced, create diverse, unique values
                  * Consider potential relationships when generating data
                  * Only generate the SQL INSERT statements to populate the tables with the synthetic data
                  * Don't include text, comments, headings or explanations in output

              3. Data Masking and Realism:
                - Generate realistic and diverse user data
                - Partially mask any data relating to last names, addresses, and email using the * symbol
                - Replace any data relating to passwords with ####
                - Leave any data relating to dates untouched

              4. Referential Integrity Considerations:
                - If a table might be referenced by a foreign key, ensure:
                  * Generated IDs can be logically used in child tables
                  * Appropriate diversity in generated values
                  * Potential for realistic relationships between tables
                - Insert tables in the correct order: first parent tables (for example users), then child tables (for example products)

              5. Formatting Requirements:
                - Use fully qualified table names (e.g., 'INSERT INTO public.users')
                - Only output SQL INSERT statements that can be used directly with psql

              Database Schema:
              ${schemaDump}
          `,
        },
      ],
    });

    const generatedSql = msg.content[0].text.replace(/\n/g, ' ');
    console.log(generatedSql);

    await fs.appendFile('./data.sql', generatedSql + '\n');

    console.log('Tables generated successfully');
    console.log(`Total rows generated: ${totalRows} rows per table`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
