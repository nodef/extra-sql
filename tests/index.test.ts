import {
  OPERATORS,
  OPERAND_COUNT,
  createTable,
  createIndex,
  createView,
  insertInto,
  insertIntoStream,
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
} from '../src';




// Testing Constants
describe('OPERATORS', () => {
  test('contains all expected SQL operators', () => {
    expect(OPERATORS.has('+')).toBe(true);
    expect(OPERATORS.has('LIKE')).toBe(true);
    expect(OPERATORS.has('NOT')).toBe(true);
    expect(OPERATORS.size).toBe(32);
  });
});


describe('OPERAND_COUNT', () => {
  test('maps operators to their operand counts', () => {
    expect(OPERAND_COUNT.get('+')).toBe(2);
    expect(OPERAND_COUNT.get('NOT')).toBe(1);
    expect(OPERAND_COUNT.get('BETWEEN')).toBe(3);
    expect(OPERAND_COUNT.size).toBe(32);
  });
});


// Testing SQL Generation Functions
describe('createTable', () => {
  test('generates SQL for table creation with primary key', () => {
    const sql = createTable('users', {id: 'SERIAL', name: 'TEXT'}, {pk: 'id'});
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL, "name" TEXT, PRIMARY KEY("id"));\n'
    );
  });


  test('generates SQL without primary key', () => {
    const sql = createTable('logs', {message: 'TEXT', timestamp: 'TIMESTAMP'});
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "logs" ("message" TEXT, "timestamp" TIMESTAMP);\n'
    );
  });
});


describe('createIndex', () => {
  test('generates SQL for index with method', () => {
    const sql = createIndex('idx_users_name', 'users', '"name"', {method: 'BTREE'});
    expect(sql).toBe(
      'CREATE INDEX IF NOT EXISTS "idx_users_name" ON "users" USING BTREE ("name");\n'
    );
  });


  test('generates SQL without method', () => {
    const sql = createIndex('idx_logs_timestamp', 'logs', '"timestamp"');
    expect(sql).toBe(
      'CREATE INDEX IF NOT EXISTS "idx_logs_timestamp" ON "logs" ("timestamp");\n'
    );
  });
});


describe('createView', () => {
  test('generates SQL for view creation', () => {
    const sql = createView('active_users', 'SELECT * FROM "users" WHERE active = true');
    expect(sql).toBe(
      'CREATE OR REPLACE VIEW "active_users" AS SELECT * FROM "users" WHERE active = true;\n'
    );
  });
});


describe('insertInto', () => {
  test('generates SQL for multiple row insert with conflict handling', () => {
    const rows = [{id: 1, name: 'Alice'}, {id: 2, name: 'Bob'}];
    const sql = insertInto('users', rows, {pk: 'id'});
    expect(sql).toBe(
      'INSERT INTO "users" ("id", "name") VALUES\n' +
      '($$1$$, $$Alice$$),\n' +
      '($$2$$, $$Bob$$)\n' +
      'ON CONFLICT ("id") DO NOTHING;\n'
    );
  });


  test('generates SQL without conflict handling', () => {
    const rows = [{message: 'Log entry', timestamp: '2023-01-01'}];
    const sql = insertInto('logs', rows);
    expect(sql).toBe(
      'INSERT INTO "logs" ("message", "timestamp") VALUES\n' +
      '($$Log entry$$, $$2023-01-01$$);\n'
    );
  });
});


describe('insertIntoStream', () => {
  test('generates SQL for streaming inserts', async () => {
    const {Readable} = require('stream');
    const stream = new Readable({objectMode: true});
    stream.push({id: 1, name: 'Alice'});
    stream.push({id: 2, name: 'Bob'});
    stream.push(null); // End stream
    const sql = await insertIntoStream('users', stream, {pk: 'id'});
    expect(sql).toBe(
      'INSERT INTO "users" ("id", "name") VALUES\n' +
      '($$1$$, $$Alice$$),\n' +
      '($$2$$, $$Bob$$)\n' +
      'ON CONFLICT ("id") DO NOTHING;\n'
    );
  });
});


describe('setupTable', () => {
  test('generates SQL for table setup with index', () => {
    const rows = [{code: 'F1', name: 'Mango'}];
    const sql = setupTable('food', {code: 'TEXT', name: 'TEXT'}, rows, {pk: 'code', index: true });
    expect(sql).toBe(
      'CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT, PRIMARY KEY("code"));\n' +
      'INSERT INTO "food" ("code", "name") VALUES\n' +
      '($$F1$$, $$Mango$$)\n' +
      'ON CONFLICT ("code") DO NOTHING;\n' +
      'CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");\n'
    );
  });
});


describe('setupTableIndex', () => {
  test('generates SQL for basic index', () => {
    const sql = setupTableIndex('food', {code: 'TEXT', name: 'TEXT'}, {pk: 'code', index: true });
    expect(sql).toBe(
      'CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");\n'
    );
  });


  test('generates SQL for tsvector index', () => {
    const sql = setupTableIndex('articles', {title: 'TEXT', content: 'TEXT'}, {
      tsvector: {title: 1, content: 2},
      index: true,
    });
    expect(sql).toBe(
      'CREATE OR REPLACE VIEW "articles_tsvector" AS SELECT *, ' +
      'setweight(to_tsvector(\'english\', "title"), \'1\')||' +
      'setweight(to_tsvector(\'english\', "content"), \'2\') AS "tsvector" FROM "articles";\n' +
      'CREATE INDEX IF NOT EXISTS "articles_tsvector_idx" ON "articles" USING GIN ((' +
      'setweight(to_tsvector(\'english\', "title"), \'1\')||' +
      'setweight(to_tsvector(\'english\', "content"), \'2\')));\n' +
      'CREATE INDEX IF NOT EXISTS "articles_title_idx" ON "articles" ("title");\n' +
      'CREATE INDEX IF NOT EXISTS "articles_content_idx" ON "articles" ("content");\n'
    );
  });
});


describe('tableExists', () => {
  test('generates SQL to check table existence', () => {
    const sql = tableExists('food');
    expect(sql).toBe(
      "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');\n"
    );
  });
});


describe('selectTsquery', () => {
  test('generates SQL for basic tsquery selection', () => {
    const sql = selectTsquery('columns', 'total fat');
    expect(sql).toBe(
      'SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\');\n'
    );
  });


  test('generates SQL with optional parameters', () => {
    const sql = selectTsquery('columns', 'total fat', '"tsvector"', {
      columns: 'id, title',
      order: true,
      limit: 5,
    });
    expect(sql).toBe(
      'SELECT id, title FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\') ' +
      'ORDER BY ts_rank("tsvector", plainto_tsquery(\'total fat\'), 0) DESC LIMIT 5;\n'
    );
  });
});


describe('matchTsquery', () => {
  test('generates SQL for matching multiple terms', () => {
    const sql = matchTsquery('columns', ['total', 'fat']);
    expect(sql).toBe(
      'SELECT *, \'2\'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total fat\') UNION ALL\n' +
      'SELECT *, \'1\'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery(\'total\');\n'
    );
  });
});


describe('createTableData', () => {
  test('generates SQL and data for table creation', () => {
    const {query, data} = createTableData('users', {id: 'SERIAL', name: 'TEXT'}, 'id');
    expect(query).toBe(
      'CREATE TABLE IF NOT EXISTS "users" ("id" SERIAL, "name" TEXT, PRIMARY KEY("id"));'
    );
    expect(data).toEqual([]);
  });
});


describe('updateData', () => {
  test('generates SQL and data for updating rows', () => {
    const {query, data} = updateData('users', {name: 'Alice'}, {id: 1 });
    expect(query).toBe('UPDATE "users" SET "name" = $1 WHERE "id" = $2;');
    expect(data).toEqual(['Alice', 1]);
  });
});


describe('selectData', () => {
  test('generates SQL and data for selecting rows', () => {
    const {query, data} = selectData('users', {id: 1 });
    expect(query).toBe('SELECT * FROM "users" WHERE "id" = $1;');
    expect(data).toEqual([1]);
  });
});


describe('insertIntoData', () => {
  test('generates SQL and data for inserting rows', () => {
    const {query, data} = insertIntoData('users', [{id: 1, name: 'Alice' }]);
    expect(query).toBe('INSERT INTO "users" ("id", "name") VALUES ($1, $2);');
    expect(data).toEqual([1, 'Alice']);
  });
});


describe('deleteData', () => {
  test('generates SQL and data for deleting rows', () => {
    const {query, data} = deleteData('users', {id: 1 });
    expect(query).toBe('DELETE FROM "users" WHERE "id" = $1;');
    expect(data).toEqual([1]);
  });
});
