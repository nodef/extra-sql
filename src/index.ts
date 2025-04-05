import {Readable} from 'stream';




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
type ColumnTypes = {[key: string]: string};

/** Weights for columns in a table (for a tsvector). */
type ColumnWeights = {[key: string]: number};

/** Data for a row in a table. */
type RowData = {[key: string]: any};


/** Options for creating a table. */
interface CreateTableOptions {
  /** Column name for the primary key. */
  pk?: string;
}


/** Options for creating an index. */
interface CreateIndexOptions {
  /** Indexing method (e.g., GIN, BTREE). */
  method?: string;
}


/** Options for inserting into a table. */
interface InsertIntoOptions {
  /** Column name for the primary key. */
  pk?: string;
}


/** Options for setting up table indexes. */
interface SetupTableIndexOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for setting up a table. */
interface SetupTableOptions {
  /** Column name for the primary key. */
  pk?: string;
  /** Whether to create an index. */
  index?: boolean;
  /** Columns, with their weights, for full-text search. */
  tsvector?: ColumnWeights;
}


/** Options for selecting with tsquery. */
interface SelectTsqueryOptions {
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
interface MatchTsqueryOptions {
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
interface QueryData {
  /** SQL query string. */
  query: string;
  /** Parameters for the query. */
  data: any[];
}
//#endregion




//#region HELPERS
/**
 * Format an object into a string based on a format pattern.
 * @param obj object to format
 * @param fmt format string with placeholders %k, %v, %i
 * @param sep separator between formatted items
 * @param i starting index for %i placeholder [0]
 * @param val array to collect values (optional)
 * @returns formatted string
 */
function _format(obj: object, fmt: string, sep: string, i: number=0, val?: any[]): string {
  const a: string[] = [];
  const ve = Array.isArray(val);
  i = i || (ve? val.length : 0);
  for (const k in obj) {
    const v = obj[k];
    a.push(fmt.replace(/%k/g, k).replace(/%v/g, String(v)).replace(/%i/g, String(i++)));
    if (ve && val) val.push(v);
  }
  return a.join(sep);
}


/**
 * Ensure a value is an array.
 * @param x value to convert to an array
 * @returns array containing the value, or the original array
 */
function _array<T>(x: T | T[] | Iterable<T>): T[] {
  if (Array.isArray(x)) return x;
  if (x==null || typeof x === 'string' || typeof x[Symbol.iterator] !== 'function') return [x as T];
  return Array.from(x as Iterable<T>);
}


/**
 * Convert Linux wildcard patterns to SQL LIKE patterns.
 * @param txt pattern to convert
 * @returns converted pattern, or null if input is null
 */
function fromLinuxWildcard(txt: string | null): string | null {
  return txt ? txt.replace(/\*/g, '%').replace(/\?/g, '_') : txt;
}


/**
 * Helper function to add a row to an INSERT INTO SQL command.
 * @param row row object with key-value pairs
 * @param acc string to accumulate to (internal use)
 * @param i current index [0]
 * @returns updated SQL string with the new row added
 */
function addRow(row: RowData, acc: string='', i: number=0): string {
  if (i === 0) {
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
 */
export function createView(name: string, query: string, opt: object=null, acc: string=''): string {
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
 */
export function insertInto(table: string, rows: RowData[], opt: InsertIntoOptions={}, acc: string=''): string {
  let i = -1;
  acc += `INSERT INTO "${table}" (`;
  for (const val of rows)
    acc = addRow(val, acc, ++i);
  acc = acc.replace(/\),\n\($/, '') + ')';
  if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
  return acc + ';\n';
}


/**
 * Generate SQL command for INSERT INTO using a stream of values.
 * @param table table name
 * @param stream readable stream of row objects `{column: value}`
 * @param opt options `{pk}`
 * @param acc string to accumulate to (internal use)
 * @returns SQL command to insert into the table (promise)
 */
export function insertIntoStream(table: string, stream: Readable, opt: InsertIntoOptions={}, acc: string=''): Promise<string> {
  let i = -1;
  acc += `INSERT INTO "${table}" (`;
  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('data', (row: RowData) => {
      acc = addRow(row, acc, ++i);
    });
    stream.on('end', () => {
      acc = acc.replace(/\),\n\($/, '') + ')';
      if (opt.pk) acc += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
      resolve(acc + ';\n');
    });
  });
}


// Attach stream variant as a property to insertInto.
insertInto.stream = insertIntoStream;


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
 */
export function setupTable(name: string, cols: ColumnTypes, rows: RowData[] | null=null, opt: SetupTableOptions={}, acc: string=''): string {
  acc = createTable(name, cols, opt, acc);
  if (rows) acc = insertInto(name, rows, opt, acc);
  return setupTableIndex(name, cols, opt, acc);
}


// Attach index variant as a property to setupTable
setupTable.index = setupTableIndex;


/**
 * Generate SQL command to check if a table exists.
 * @param name table name
 * @returns SQL command to check if the table exists
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
 */
export function matchTsquery(table: string, words: string[], tsv: string='"tsvector"', opt: MatchTsqueryOptions={}): string {
  const col = opt.columns || '*';
  const nrm = opt.normalization || 0;
  let acc = '';
  for (let i = words.length; i>0; i--) {
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
export function createTableData(table: string, cols: ColumnTypes, pkeys?: string | string[]): QueryData {
  return {
    query: `CREATE TABLE IF NOT EXISTS "${table}" (` +
      `${_format(cols, '"%k" %v', ', ')}` +
      (pkeys ? `, PRIMARY KEY(${_format(_array(pkeys), '"%v"', ', ')})` : ``) + `);`,
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
  const par: any[] = [];
  const setStr = _format(set   || {}, '"%k" = $%i', ', ', 1, par);
  const exp    = _format(where || {}, `"%k" ${op} $%i`, ` ${sep} `, par.length + 1, par);
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
  const par: any[] = [];
  const exp = _format(whr || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
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
  const par: any[] = [];
  const into    = _format(rows[0] || {}, '"%k"', ', ', 1, par);
  const rowsStr = _format(par, '$%i', ', ', 1);
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
  const par: any[] = [];
  const exp = _format(where || {}, `"%k" ${op} $%i`, ` ${sep} `, 1, par);
  return {
    query: `DELETE FROM "${table}"${exp ? ' WHERE ' + exp : ''};`,
    data: par
  };
}
