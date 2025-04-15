//#region CONSTANTS
/** Set of operators in SQL. */
export const OPERATORS: Set<string> = new Set([
  // Arithmetic operators
  '+', '-', '*', '/', '%',
  // Bitwise operators
  '&', '|', '^',
  // Comparison operators
  '=', '>', '<', '>=', '<=', '<>',
  // Compound operators
  '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=',
  // Logical operators
  'ALL', 'AND', 'ANY', 'BETWEEN', 'EXISTS', 'IN', 'LIKE', 'NOT', 'OR', 'SOME'
]);


/**
 * Number of operands used with an SQL operator.
 */
export const OPERAND_COUNT: Map<string, number> = new Map([
  // Arithmetic operators
  ['+', 2], ['-', 2], ['*', 2], ['/', 2], ['%', 2],
  // Bitwise operators
  ['&', 2], ['|', 2], ['^', 2],
  // Comparison operators
  ['=', 2], ['>', 2], ['<', 2], ['>=', 2], ['<=', 2], ['<>', 2],
  // Compound operators
  ['+=', 2], ['-=', 2], ['*=', 2], ['/=', 2], ['%=', 2], ['&=', 2], ['^=', 2], ['|=', 2],
  // Logical operators
  ['ALL', 2], ['AND', 2], ['ANY', 2], ['BETWEEN', 3], ['EXISTS', 1], ['IN', 2], ['LIKE', 2], ['NOT', 1], ['OR', 2], ['SOME', 2]
]);
//#endregion




//#region TYPES
/** Types for columns in a table. */
export type ColumnTypes = {[key: string]: string};

/** Weights for columns in a table (for a tsvector). */
export type ColumnWeights = {[key: string]: string};

/** Data for a row in a table. */
export type RowData = Record<string, unknown>;


/** Options for creating a table. */
export interface CreateTableOptions {
  /** Column name for the primary key. */
  pk?: string;
}


/** Options for creating an index. */
export interface CreateIndexOptions {
  /** Indexing method (e.g., GIN, BTREE). */
  method?: string;
}


/** Options for inserting into a table. */
export interface InsertIntoOptions {
  /** Column name for the primary key. */
  pk?: string;
}


/** Options for setting up table indexes. */
export interface SetupTableIndexOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for setting up a table. */
export interface SetupTableOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for selecting with tsquery. */
export interface SelectTsqueryOptions {
  /** Columns to select. */
  columns?: string;
  /** Whether to order the results. */
  order?: boolean;
  /** Limit the number of results. */
  limit?: number;
  /** Normalization weight used during ranking (in ts_rank). */
  normalization?: number;
}


/** Options for matching with tsquery. */
export interface MatchTsqueryOptions {
  /** Columns to select. */
  columns?: string;
  /** Whether to order the results. */
  order?: boolean;
  /** Limit the number of results. */
  limit?: number;
  /** Normalization weight used during ranking (in ts_rank). */
  normalization?: number;
}


/** Query data with SQL and parameters. */
export interface QueryData {
  /** SQL query string. */
  query: string;
  /** Parameters for the query. */
  data: unknown[];
}
//#endregion




//#region HELPERS
/**
 * Ensure a value is an array.
 * @param x value to convert to an array
 * @returns array containing the value, or the original array
 */
function asArray<T>(x: unknown): T[] {
  if (Array.isArray(x)) return x;
  if (x==null || typeof x === 'string' || typeof (x as Iterable<T>)[Symbol.iterator] !== 'function') return [x as T];
  return Array.from(x as Iterable<T>);
}


/**
 * Format an object into a string based on a format pattern.
 * @param obj object to format
 * @param fmt format string with placeholders %k, %v, %i
 * @param sep separator between formatted items
 * @param i starting index for %i placeholder [0]
 * @param val array to collect values (optional)
 * @returns formatted string
 */
function formatData(obj: RowData, fmt: string, sep: string, i: number=0, val?: unknown[]): string {
  const a: string[] = [];
  const ve = Array.isArray(val);
  i = i || (ve? val.length : 0);
  for (const k in obj) {
    const v = obj[k];
    a.push(fmt.replace(/%k/g, k).replace(/%v/g, String(v)).replace(/%i/g, String(i++)));
    if (ve) val.push(v);
  }
  return a.join(sep);
}


/**
 * Helper function to add a row to an INSERT INTO SQL command.
 * @param row row object with key-value pairs
 * @param acc string to accumulate to (internal use)
 * @param i current index [0]
 * @returns updated SQL string with the new row added
 */
function addRow(row: RowData, acc: string='', i: number=0): string {
  if (i===0) {
    for (const k in row)
      acc += `"${k}", `;
    acc  = acc.endsWith(', ')? acc.substring(0, acc.length - 2) : acc;
    acc += ') VALUES\n(';
  }
  for (const k in row)
    acc += row[k] == null? 'NULL, ' : `$$${row[k]}$$, `;
  acc  = acc.endsWith(', ')? acc.substring(0, acc.length - 2) : acc;
  acc += '),\n(';
  return acc;
}
//#endregion




/**
 * Generate SQL command for CREATE TABLE.
 * @param name table name
 * @param cols columns `{name: type}`
 * @param opt options `{pk}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the table
 * @example
 * ```ts
 * xsql.createTable("plant", {name: "TEXT", type: "TEXT", age: "INT"});
 * // → CREATE TABLE IF NOT EXISTS "plant" ("name" TEXT, "type" TEXT, "age" INT);
 *
 * xsql.createTable("animal", {name: "TEXT", type: "TEXT", age: "INT"}, {pk: "name"});
 * // → CREATE TABLE IF NOT EXISTS "animal" ("name" TEXT, "type" TEXT, "age" INT, PRIMARY KEY("name"));
 * ```
 */
export function createTable(name: string, cols: ColumnTypes, opt: CreateTableOptions={}, acc: string=''): string {
  acc += `CREATE TABLE IF NOT EXISTS "${name}" (`;
  for (const k in cols)
    acc += `"${k}" ${cols[k]}, `;
  if (opt.pk) acc += `PRIMARY KEY("${opt.pk}"), `;
  return acc.replace(/, $/, '') + `);\n`;
}


/**
 * Generate SQL command for CREATE INDEX.
 * @param name index name
 * @param table table name
 * @param expr index expression
 * @param opt options `{method}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the index
 * @example
 * ```ts
 * xsql.createIndex("food_code_idx", "food", `"code"`);
 * // → CREATE INDEX IF NOT EXISTS "food_code_idx" ON "food" ("code");
 *
 * xsql.createIndex("food_type_idx", "food", `"type"`, {method: "GIN"});
 * // → CREATE INDEX IF NOT EXISTS "food_type_idx" ON "food" USING GIN ("type");
 * ```
 */
export function createIndex(name: string, table: string, expr: string, opt: CreateIndexOptions={}, acc: string=''): string {
  acc += `CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" `;
  if (opt.method) acc += `USING ${opt.method} `;
  return acc + `(${expr});\n`;
}


/**
 * Generate SQL command for CREATE VIEW.
 * @param name view name
 * @param query view query
 * @param opt options (currently unused)
 * @param acc string to accumulate to (internal use)
 * @returns SQL command for creating the view
 * @example
 * ```ts
 * xsql.createView("food_code", "SELECT \"code\" FROM \"food\"");
 * // → CREATE OR REPLACE VIEW "food_code" AS SELECT "code" FROM "food";
 * ```
 */
export function createView(name: string, query: string, _opt: object | null=null, acc: string=''): string {
  acc += `CREATE OR REPLACE VIEW "${name}" AS ${query};\n`;
  return acc;
}


/**
 * Generates SQL command for INSERT INTO using an array of values.
 * @param table table name
 * @param rows row objects `{column: value}`
 * @param opt options `{pk}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command to insert into the table
 * @example
 * ```ts
 * xsql.insertInto("food", [{code: "F1", name: "Mango"}]);
 * // → INSERT INTO "food" ("code", "name") VALUES\n($$F1$$, $$Mango$$);
 *
 * xsql.insertInto("food", [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}], {pk: "code"});
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ($$F1$$, $$Mango$$),
 * // → ($$F2$$, $$Lychee$$)
 * // → ON CONFLICT ("code") DO NOTHING;
 * ```
 */
export function insertInto(table: string, rows: Iterable<RowData>, opt: InsertIntoOptions={}, acc: string=''): string {
  let i = -1;
  acc += `INSERT INTO "${table}" (`;
  for (const val of rows)
    acc = addRow(val, acc, ++i);
  acc = acc.replace(/\),\n\($/, '') + ')';
  if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
  return acc + ';\n';
}


/**
 * Generate a tsvector expression for full-text search.
 * @param cols columns with their weights `{name: weight}`
 * @returns tsvector expression
 */
function tsvector(cols: ColumnWeights): string {
  let acc = '';
  for (const k in cols) {
    if (cols[k]) acc += `setweight(to_tsvector('english', "${k}"), '${cols[k]}')||`;
  }
  return acc.replace(/\|\|$/, '');
}


/**
 * Generate SQL commands for setting up table indexes and views.
 * @param table table name
 * @param cols columns with their types `{name: type}`
 * @param opt options `{pk, index, tsvector}`
 * @param acc Accumulator for the SQL string (internal use).
 * @returns SQL commands for setting up the table indexes and views
 */
export function setupTableIndex(table: string, cols: ColumnTypes, opt: SetupTableIndexOptions={}, acc: string=''): string {
  if (opt.tsvector) {
    const tv = tsvector(opt.tsvector);
    acc += createView(table + '_tsvector', `SELECT *, ${tv} AS "tsvector" FROM "${table}"`);
    if (opt.index) acc += createIndex(table + '_tsvector_idx', table, `(${tv})`, { method: 'GIN' });
  }
  if (opt.index) {
    for (const k in cols) {
      if (cols[k] == null || k === opt.pk) continue;
      const knam = k.replace(/\W+/g, '_').toLowerCase();
      acc += createIndex(`${table}_${knam}_idx`, table, `"${k}"`);
    }
  }
  return acc;
}


/**
 * Generate SQL commands to set up a table (create, insert, index).
 * @param name table name
 * @param cols columns with their types `{name: type}`
 * @param rows rows to insert (optional)
 * @param opt options `{pk, index, tsvector}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL commands for setting up the table
 * @example
 * ```ts
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}]);
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}],
 *   {index: true});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 * // → CREATE INDEX IF NOT EXISTS food_code_idx ON "food" ("code");
 * // → CREATE INDEX IF NOT EXISTS food_name_idx ON "food" ("name");
 *
 * xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
 *   [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}],
 *   {pk: "code", index: true, tsvector: {code: "A", name: "B"}});
 * // → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT, PRIMARY KEY("code"));
 * // → INSERT INTO "food" ("code", "name") VALUES
 * // → ('F1', 'Mango'),
 * // → ('F2', 'Lychee');
 * // → ON CONFLICT ("code") DO NOTHING;
 * // → CREATE OR REPLACE VIEW "food_tsvector" AS SELECT *, setweight(to_tsvector('english', "code"), 'A')||setweight(to_tsvector('english', "name"), 'B') AS "tsvector" FROM "food";
 * // → CREATE INDEX IF NOT EXISTS "food_tsvector_idx" ON "food" USING GIN ((setweight(to_tsvector('english', "code"), 'A')||setweight(to_tsvector('english', "name"), 'B')));
 * // → CREATE INDEX IF NOT EXISTS "food_name_idx" ON "food" ("name");
 * ```
 */
export function setupTable(name: string, cols: ColumnTypes, rows: Iterable<RowData> | null=null, opt: SetupTableOptions={}, acc: string=''): string {
  acc = createTable(name, cols, opt, acc);
  if (rows) acc = insertInto(name, rows, opt, acc);
  return setupTableIndex(name, cols, opt, acc);
}


/**
 * Generate SQL command to check if a table exists.
 * @param name table name
 * @returns SQL command to check if the table exists
 * @example
 * ```ts
 * xsql.tableExists("food");
 * // → SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');
 * ```
 */
export function tableExists(name: string): string {
  return `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${name}');\n`;
}


/**
 * Generate SQL command for SELECT with tsquery.
 * @param table table name
 * @param query plain query words
 * @param tsv tsvector column name ["tsvector"]
 * @param opt options `{columns, order, limit, normalization}`
 * @returns SQL command for selecting with tsquery
 * @example
 * ```ts
 * xsql.selectTsquery("columns", "total fat");
 * // → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');
 *
 * xsql.selectTsquery("columns", "total fat", '"tsvector"', {columns: '"code"'});
 * // → SELECT "code" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');
 *
 * xsql.selectTsquery("columns", "total fat", '"tsvector"', {order: true, limit: 1, normalization: 2});
 * // → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') ORDER BY ts_rank("tsvector", plainto_tsquery('total fat'), 2) DESC LIMIT 1;
 * ```
 */
export function selectTsquery(table: string, query: string, tsv: string='"tsvector"', opt: SelectTsqueryOptions={}): string {
  const col = opt.columns || '*';
  const nrm = opt.normalization || 0;
  let acc = `SELECT ${col} FROM "${table}" WHERE ${tsv} @@ plainto_tsquery('${query}')`;
  if (opt.order) acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${query}'), ${nrm}) DESC`;
  if (opt.limit) acc += ` LIMIT ${opt.limit}`;
  acc += `;\n`;
  return acc;
}


/**
 * Generate SQL query for matching words with tsquery.
 * @param table table name
 * @param words match words
 * @param tsv tsvector column name ["tsvector"]
 * @param opt options `{columns, order, limit, normalization}`
 * @returns SQL query for matching words with tsquery
 * @example
 * ```ts
 * xsql.matchTsquery("columns", ["total", "fat"]);
 * // → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
 * // → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
 *
 * xsql.matchTsquery("columns", ["total", "fat"], '"tsvector"', {columns: '"code"'});
 * // → SELECT "code", '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
 * // → SELECT "code", '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
 *
 * xsql.matchTsquery("columns", ["total", "fat"], '"tsvector"', {order: true, limit: 1, normalization: 2});
 * // → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') ORDER BY ts_rank("tsvector", plainto_tsquery('total fat'), 2) DESC UNION ALL
 * // → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total') ORDER BY ts_rank("tsvector", plainto_tsquery('total'), 2) DESC LIMIT 1;
 * ```
 */
export function matchTsquery(table: string, words: string[], tsv: string='"tsvector"', opt: MatchTsqueryOptions={}): string {
  const col = opt.columns || '*';
  const nrm = opt.normalization || 0;
  let acc = '';
  for (let i=words.length; i>0; i--) {
    const qry = words.slice(0, i).join(' ').replace(/([\'\"])/g, '$1$1');
    acc += `SELECT ${col}, '${i}'::INT AS "matchTsquery" FROM "${table}"`;
    acc += ` WHERE ${tsv} @@ plainto_tsquery('${qry}')`;
    if (opt.order) acc += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${qry}'), ${nrm}) DESC`;
    acc += ' UNION ALL\n';
  }
  acc = acc.substring(0, acc.length - 11);
  if (opt.limit) acc += ` LIMIT ${opt.limit}`;
  acc += ';\n';
  return acc;
}


/**
 * Generate SQL command for creating a table with data.
 * @param table table name
 * @param cols columns with their types `{name: type}`
 * @param pkeys primary key(s)
 * @returns query data for creating the table `{query, data}`
 */
export function createTableData(table: string, cols: ColumnTypes, pkeys?: string | Iterable<string>): QueryData {
  return {
    query: `CREATE TABLE IF NOT EXISTS "${table}" (` +
      `${formatData(cols, '"%k" %v', ', ')}` +
      (pkeys? `, PRIMARY KEY(${formatData(asArray(pkeys) as unknown as RowData, '"%v"', ', ')})` : ``) + `);`,
    data: []
  };
}


/**
 * Generate SQL command for updating data.
 * @param table table name
 * @param set columns to set `{column: value}`
 * @param where where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @returns query data for updating the data `{query, data}`
 */
export function updateData(table: string, set: RowData, where: RowData, op: string='=', sep: string='AND'): QueryData {
  const par: unknown[] = [];
  const setStr = formatData(set   || {}, '"%k" = $%i', ', ', 1, par);
  const exp    = formatData(where || {}, `"%k" ${op} $%i`, ` ${sep} `, par.length + 1, par);
  return {
    query: `UPDATE "${table}" SET ${setStr}${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}


/**
 * Generate SQL command for selecting data.
 * @param tab table name
 * @param whr where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @returns query data for selecting the data `{query, data}`
 */
export function selectData(tab: string, whr: RowData, op: string='=', sep: string='AND'): QueryData {
  const par: unknown[] = [];
  const exp = formatData(whr || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
  return {
    query: `SELECT * FROM "${tab}"${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}


/**
 * Generate SQL command for inserting data.
 * @param table table name
 * @param rows rows to insert
 * @returns query data for inserting the data `{query, data}`
 */
export function insertIntoData(table: string, rows: RowData[]): QueryData {
  const par: unknown[] = [];
  const into    = formatData(rows[0] || {}, '"%k"', ', ', 1, par);
  const rowsStr = formatData(par as unknown as RowData, '$%i', ', ', 1);
  return {
    query: `INSERT INTO "${table}" (${into}) VALUES (${rowsStr});`,
    data: par
  };
}


/**
 * Generate SQL command for deleting data.
 * @param table table name
 * @param where where conditions `{column: value}`
 * @param op operator for conditions ['=']
 * @param sep separator for conditions ['AND']
 * @returns query data for deleting the data `{query, data}`
 */
export function deleteData(table: string, where: RowData, op: string='=', sep: string='AND'): QueryData {
  const par: unknown[] = [];
  const exp = formatData(where || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
  return {
    query: `DELETE FROM "${table}"${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}




// /**
//  * Convert Linux wildcard patterns to SQL LIKE patterns.
//  * @param txt pattern to convert
//  * @returns converted pattern, or null if input is null
//  */
// function fromLinuxWildcard(txt: string | null): string | null {
//   return txt ? txt.replace(/\*/g, '%').replace(/\?/g, '_') : txt;
// }


// /**
//  * Generate SQL command for INSERT INTO using a stream of values.
//  * @param table table name
//  * @param stream readable stream of row objects `{column: value}`
//  * @param opt options `{pk}`
//  * @param acc string to accumulate to (internal use)
//  * @returns SQL command to insert into the table (promise)
//  */
// export function insertIntoStream(table: string, stream: Readable, opt: InsertIntoOptions={}, acc: string=''): Promise<string> {
//   let i = -1;
//   acc += `INSERT INTO "${table}" (`;
//   return new Promise((resolve, reject) => {
//     stream.on('error', reject);
//     stream.on('data', (row: RowData) => {
//       acc = addRow(row, acc, ++i);
//     });
//     stream.on('end', () => {
//       acc = acc.replace(/\),\n\($/, '') + ')';
//       if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
//       resolve(acc + ';\n');
//     });
//   });
// }
