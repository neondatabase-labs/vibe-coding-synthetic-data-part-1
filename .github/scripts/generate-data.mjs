import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import { faker } from '@faker-js/faker';

(async () => {
  try {
    // Fetch schema from file
    const schemaDump = await fs.readFile('schema.sql', 'utf8');
    console.log('Schema file read successfully');

    const totalRows = 100;

    console.log(`Step 1: Generating ${totalRows} rows of data for parent tables...`);

    // Initialize the Anthropic LLM client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Send the request to generate the faker.js function
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
              2. Please generate the data generation logic in **JavaScript** that generates exactly ${totalRows} rows for the schema above using **@faker-js/faker** (the latest version).
              3. Ensure that it can be executed immediately without additional formatting, explanations, or imports.
              4. Do NOT include the function declaration \`const { faker } = require('@faker-js/faker');\`. Assume that **faker** is already globally available.
              5. **Do not wrap the code in a function declaration**. The response should **only include the code that generates the data for each table** (users, products, transactions, etc.). This code will be wrapped in a function outside your response.
              6. Ensure that the generated code:
                  - Generates rows based on the schema provided below.
                  - Ensures uniqueness where applicable (such as user emails, IDs, etc.).
                  - Handles relationships between parent and child tables (e.g., foreign keys).
              7. The output should **only contain the code** for generating the rows. There should be no extra text, explanations, or code fences.
              8. **Return an object** with the keys as the table names as defined in the schema and the values as arrays of generated data for each table. 

              IMPORTANT NOTE: 
              - Use the correct **faker methods** for **"@faker-js/faker": "^9.5.1"**.
              - Ensure that the methods used are valid for the latest version and not outdated or incorrect methods.

              Database Schema:
              ${schemaDump}

              The function should generate exactly ${totalRows} rows for each table based on the schema.
          `,
        },
      ],
    });

    // Get the generated data generation code from LLM response
    const generatedCode = msg.content[0].text.trim();

    // Dynamically create the function body from LLM response
    const generateTestData = new Function('faker', generatedCode);

    // Call the function with the globally available `faker`
    let result;
    try {
      result = generateTestData(faker);
    } catch (err) {
      console.error('Error while executing generated code:', err.message);
      return;
    }

    // Generate SQL INSERT statements dynamically
    const generateSQLInsertStatements = (result) => {
      return Object.entries(result)
        .map(([table, rows]) => {
          const columns = Object.keys(rows[0]);
          const columnNames = columns.join(', ');

          const values = rows
            .map((row) => {
              return (
                '(' +
                columns
                  .map((column) => {
                    let value = row[column];

                    if (value instanceof Date) {
                      // Format date values to 'YYYY-MM-DD HH:MM:SS'
                      const formattedDate = value.toISOString().slice(0, 19).replace('T', ' ');
                      return `'${formattedDate}'`; // Wrap in single quotes
                    }

                    if (typeof value === 'string') {
                      return `'${value.replace(/'/g, "''")}'`; // Escape single quotes in strings
                    }

                    if (value === null || value === undefined) {
                      return 'NULL';
                    }

                    return value;
                  })
                  .join(', ') +
                ')'
              ); // Wrap each row's values in parentheses
            })
            .join(',\n'); // Join multiple rows with commas

          return `INSERT INTO public.${table} (${columnNames}) VALUES\n${values};`; // Added 'public.' before the table name
        })
        .join('\n');
    };

    const sqlInsertStatements = generateSQLInsertStatements(result);
    console.log(sqlInsertStatements);

    // Write SQL file to be picked up by Action
    await fs.writeFile('data.sql', sqlInsertStatements);
    console.log('SQL file generated successfully');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
