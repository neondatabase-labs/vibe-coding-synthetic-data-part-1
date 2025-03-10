import 'dotenv/config';
import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import { faker } from '@faker-js/faker';

(async () => {
  try {
    const schemaDump = await fs.readFile('schema.sql', 'utf8');
    console.log('Schema file read successfully');

    const totalRows = 3000;
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

    const generatedCode = msg.content[0].text.trim();

    const generateTestData = new Function('faker', generatedCode);
    console.log(generateTestData);

    let result;
    try {
      result = generateTestData(faker);
    } catch (err) {
      console.error('Error while executing generated code:', err.message);
      return;
    }

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
                      const formattedDate = value.toISOString().slice(0, 19).replace('T', ' ');
                      return `'${formattedDate}'`;
                    }

                    if (typeof value === 'string') {
                      return `'${value.replace(/'/g, "''")}'`;
                    }

                    if (value === null || value === undefined) {
                      return 'NULL';
                    }

                    return value;
                  })
                  .join(', ') +
                ')'
              );
            })
            .join(',\n');

          return `INSERT INTO public.${table} (${columnNames}) VALUES\n${values};`;
        })
        .join('\n');
    };

    const sqlInsertStatements = generateSQLInsertStatements(result);
    console.log(sqlInsertStatements);

    await fs.writeFile('data.sql', sqlInsertStatements);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
