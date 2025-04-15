import {assert, assertEquals} from "jsr:@std/assert";
import {
  OPERATORS,
  OPERAND_COUNT,
  createTable,
  createIndex,
  createView,
  insertInto,
  setupTable,
  setupTableIndex,
  tableExists,
  selectTsquery,
  matchTsquery,
  createTableData,
  updateData,
  selectData,
  insertIntoData,
  deleteData,
} from "./index.ts";




//#region TESTING CONSTANTS
Deno.test("OPERATORS - contains all expected SQL operators", () => {
  assert(OPERATORS.has('+'), "OPERATORS should contain '+'");
  assert(OPERATORS.has('LIKE'), "OPERATORS should contain 'LIKE'");
  assert(OPERATORS.has('NOT'), "OPERATORS should contain 'NOT'");
  assertEquals(OPERATORS.size, 32, "OPERATORS should have size 32");
});


Deno.test("OPERAND_COUNT - maps operators to their operand counts", () => {
  assertEquals(OPERAND_COUNT.get('+'), 2, "Operand count for '+' should be 2");
  assertEquals(OPERAND_COUNT.get('NOT'), 1, "Operand count for 'NOT' should be 1");
  assertEquals(OPERAND_COUNT.get('BETWEEN'), 3, "Operand count for 'BETWEEN' should be 3");
  assertEquals(OPERAND_COUNT.size, 32, "OPERAND_COUNT should have size 32");
});
//#endregion




//#region TESTING SQL GENERATION FUNCTIONS
Deno.test("createTable - generates SQL for table creation with primary key", () => {
  const sql = createTable('users', {id: 'SERIAL', name: 'TEXT'}, {pk: 'id'});
  assertEquals(
    sql,
    'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL, "name" TEXT, PRIMARY KEY("id"));\n'
  );
});


Deno.test("createTable - generates SQL without primary key", () => {
  const sql = createTable('logs', {message: 'TEXT', timestamp: 'TIMESTAMP'});
  assertEquals(
    sql,
    'CREATE TABLE IF NOT EXISTS "logs" ("message" TEXT, "timestamp" TIMESTAMP);\n'
  );
});


Deno.test("createIndex - generates SQL for index with method", () => {
  const sql = createIndex('idx_users_name', 'users', '"name"', {method: 'BTREE'});
  assertEquals(
    sql,
    'CREATE INDEX IF NOT EXISTS "idx_users_name" ON "users" USING BTREE ("name");\n'
  );
});


Deno.test("createIndex - generates SQL without method", () => {
  const sql = createIndex('idx_logs_timestamp', 'logs', '"timestamp"');
  assertEquals(
    sql,
    'CREATE INDEX IF NOT EXISTS "idx_logs_timestamp" ON "logs" ("timestamp");\n'
  );
});


Deno.test("createView - generates SQL for view creation", () => {
  const sql = createView('active_users', 'SELECT * FROM "users" WHERE active = true');
  assertEquals(
    sql,
    'CREATE OR REPLACE VIEW "active_users" AS SELECT * FROM "users" WHERE active = true;\n'
  );
});


Deno.test("insertInto - generates SQL for multiple row insert with conflict handling", () => {
  const rows = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
  const sql = insertInto('users', rows, {pk: 'id'});
  assertEquals(
    sql,
    'INSERT INTO "users" ("id", "name") VALUES\n' +
    '($$1$$, $$Alice$$),\n' +
    '($$2$$, $$Bob$$)\n' +
    'ON CONFLICT ("id") DO NOTHING;\n'
  );
});


Deno.test("insertInto - generates SQL without conflict handling", () => {
  const rows = [{message: 'Log entry', timestamp: '2023-01-01'}];
  const sql = insertInto('logs', rows);
  assertEquals(
    sql,
    'INSERT INTO "logs" ("message", "timestamp") VALUES\n' +
    '($$Log entry$$, $$2023-01-01$$);\n'
  );
});


Deno.test("setupTable - generates SQL for table setup with index", () => {
  const rows = [{code: 'F1', name: 'Mango'}];
  const sql = setupTable('food', {code: 'TEXT', name: 'TEXT'}, rows, {pk: 'code', index: true });
  assertEquals(
    sql,
    'CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT, PRIMARY KEY("code"));\n' +
    'INSERT INTO "food" ("code", "name") VALUES\n' +
    '($$F1$$, $$Mango$$)\n' +
    'ON CONFLICT ("code") DO NOTHING;\n' +
    'CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");\n'
  );
});


Deno.test("setupTableIndex - generates SQL for basic index", () => {
  const sql = setupTableIndex('food', {code: 'TEXT', name: 'TEXT'}, {pk: 'code', index: true });
  assertEquals(
    sql,
    'CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");\n'
  );
});


Deno.test("setupTableIndex - generates SQL for tsvector index", () => {
  const sql = setupTableIndex('articles', {title: 'TEXT', content: 'TEXT'}, {
    tsvector: {title: 'A', content: 'B'},
    index: true,
  });
  assertEquals(
    sql,
    'CREATE OR REPLACE VIEW "articles_tsvector" AS SELECT *, ' +
    'setweight(to_tsvector(\'english\', "title"), \'A\')||' +
    'setweight(to_tsvector(\'english\', "content"), \'B\') AS "tsvector" FROM "articles";\n' +
    'CREATE INDEX IF NOT EXISTS "articles_tsvector_idx" ON "articles" USING GIN ((' +
    'setweight(to_tsvector(\'english\', "title"), \'A\')||' +
    'setweight(to_tsvector(\'english\', "content"), \'B\')));\n' +
    'CREATE INDEX IF NOT EXISTS "articles_title_idx" ON "articles" ("title");\n' +
    'CREATE INDEX IF NOT EXISTS "articles_content_idx" ON "articles" ("content");\n'
  );
});


Deno.test("tableExists - generates SQL to check table existence", () => {
  const sql = tableExists('food');
  assertEquals(
    sql,
    "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');\n"
  );
});


Deno.test("selectTsquery - generates SQL for basic tsquery selection", () => {
  const sql = selectTsquery('columns', 'total fat');
  assertEquals(
    sql,
    'SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\');\n'
  );
});


Deno.test("selectTsquery - generates SQL with optional parameters", () => {
  const sql = selectTsquery('columns', 'total fat', '"tsvector"', {
    columns: 'id, title',
    order: true,
    limit: 5,
  });
  assertEquals(
    sql,
    'SELECT id, title FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\') ' +
    'ORDER BY ts_rank("tsvector", plainto_tsquery(\'total fat\'), 0) DESC LIMIT 5;\n'
  );
});


Deno.test("matchTsquery - generates SQL for matching multiple terms", () => {
  const sql = matchTsquery('columns', ['total', 'fat']);
  assertEquals(
    sql,
    'SELECT *, \'2\'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\') UNION ALL\n' +
    'SELECT *, \'1\'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total\');\n'
  );
});


Deno.test("createTableData - generates SQL and data for table creation", () => {
  const {query, data} = createTableData('users', {id: 'SERIAL', name: 'TEXT'}, 'id');
  assertEquals(
    query,
    'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL, "name" TEXT, PRIMARY KEY("id"));'
  );
  assertEquals(data, []); // Use assertEquals for deep comparison
});


Deno.test("updateData - generates SQL and data for updating rows", () => {
  const {query, data} = updateData('users', {name: 'Alice'}, {id: 1 });
  assertEquals(query, 'UPDATE "users" SET "name" = $1 WHERE "id" = $2;');
  assertEquals(data, ['Alice', 1]); // Use assertEquals for deep comparison
});


Deno.test("selectData - generates SQL and data for selecting rows", () => {
  const {query, data} = selectData('users', {id: 1 });
  assertEquals(query, 'SELECT * FROM "users" WHERE "id" = $1;');
  assertEquals(data, [1]); // Use assertEquals for deep comparison
});


Deno.test("insertIntoData - generates SQL and data for inserting rows", () => {
  const {query, data} = insertIntoData('users', [{id: 1, name: 'Alice' }]);
  assertEquals(query, 'INSERT INTO "users" ("id", "name") VALUES ($1, $2);');
  assertEquals(data, [1, 'Alice']); // Use assertEquals for deep comparison
});


Deno.test("deleteData - generates SQL and data for deleting rows", () => {
  const {query, data} = deleteData('users', {id: 1 });
  assertEquals(query, 'DELETE FROM "users" WHERE "id" = $1;');
  assertEquals(data, [1]); // Use assertEquals for deep comparison
});
//#endregion




// Deno.test("insertIntoStream - generates SQL for streaming inserts", async () => {
//   // Using an async generator which is idiomatic in Deno
//   async function* generateData() {
//     yield { id: 1, name: 'Alice' };
//     yield { id: 2, name: 'Bob' };
//   }
//   const stream = generateData();
//   // Assuming insertIntoStream accepts an AsyncIterable
//   const sql = await insertIntoStream('users', stream, { pk: 'id' });
//   assertEquals(
//     sql,
//     'INSERT INTO "users" ("id", "name") VALUES\n' +
//     '($$1$$, $$Alice$$),\n' +
//     '($$2$$, $$Bob$$)\n' +
//     'ON CONFLICT ("id") DO NOTHING;\n'
//   );
// });
