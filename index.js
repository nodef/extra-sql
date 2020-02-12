/**
 * Set of operators in SQL.
 */
const OPERATORS = new Set([
	// arithmetic operators
	'+', '-', '*', '/', '%',
	// bitwise operators
	'&', '|', '^',
	// comparision operators
	'=', '>', '<', '>=', '<=', '<>',
	// compound operators
	'+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=',
	// logical operators
	'ALL', 'AND', 'ANY', 'BETWEEN', 'EXISTS', 'IN', 'IN', 'LIKE', 'NOT', 'OR', 'SOME'
]);

/**
 * Number of operands used with an SQL operator.
 */
const OPERAND_COUNT = new Map([
  // arithmetic operators
  ['+', 2], ['-', 2], ['*', 2], ['/', 2], ['%', 2],
  // bitwise operators
  ['&', 2], ['|', 2], ['^', 2],
  // comparision operators
  ['=', 2], ['>', 2], ['<', 2], ['>=', 2], ['<=', 2], ['<>', 2],
  // compound operators
  ['+=', 2], ['-=', 2], ['*=', 2], ['/=', 2], ['%=', 2], ['&=', 2], ['^=', 2], ['|=', 2],
  // logical operators
  ['ALL', 2], ['AND', 2], ['ANY', 2], ['BETWEEN', 3], ['EXISTS', 1], ['IN', 2], ['LIKE', 2], ['NOT', 1], ['OR', 2], ['SOME', 2]
]);


function fromLinuxWildcard(txt) {
  return txt? txt.replace(/\*/g, '%').replace(/\?/g, '_') : txt;
}


/**
 * Generates SQL command for CREATE TABLE.
 * @param {string} nam table name
 * @param {object} cols columns {name: type}
 * @param {object} opt options {pk}
 * @param {string} opt.pk primary key (null => none)
 * @param {string} z please dont use
 * @returns {string} SQL command
 */
function createTable(nam, cols, opt={}, z='') {
  z += `CREATE TABLE IF NOT EXISTS "${nam}" (`;
  for(var k in cols)
    z += `"${k}" ${cols[k]}, `;
  if(opt.pk) z += `PRIMARY KEY("${opt.pk}"), `;
  return z.replace(/, $/, '')+`);\n`;
}


/**
 * Generates SQL command for CREATE INDEX.
 * @param {string} nam index name
 * @param {string} tab table name
 * @param {string} exp index expression
 * @param {object} opt options {method}
 * @param {string} opt.method index method (null => btree)
 * @param {string} z please dont use
 * @returns {string} SQL command
 */
function createIndex(nam, tab, exp, opt={}, z='') {
  z += `CREATE INDEX IF NOT EXISTS "${nam}" ON "${tab}" `;
  if(opt.method) z += `USING ${opt.method} `;
  return z+`(${exp});\n`;
}


/**
 * Generates SQL command for CREATE VIEW.
 * @param {string} nam view name
 * @param {string} qry view query
 * @param {object} opt options
 * @param {string} z please dont use
 * @returns {string} SQL command
 */
function createView(nam, qry, opt=null, z='') {
  z += `CREATE OR REPLACE VIEW "${nam}" AS ${qry};\n`;
  return z;
}


function addRow(val, z='', i=0) {
  if(i===0) {
    for(var k in val)
      z += `"${k}", `;
    z = z.endsWith(', ')? z.substring(0, z.length-2):z;
    z += ') VALUES\n(';
  }
  for(var k in val)
    z += val[k]==null? 'NULL, ':`$$${val[k]}$$, `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += '),\n(';
  return z;
};

/**
 * Generates SQL command for INSERT INTO.
 * @param {string} tab table name
 * @param {Stream<object>} strm readable stream with row objects {column: value}
 * @param {object} opt options {pk}
 * @param {string} opt.pk primary key, on conflict (null => none)
 * @param {string} z please dont use
 * @returns {string} SQL command
 */
function insertIntoStream(tab, strm, opt={}, z='') {
  var i = -1;
  z += `INSERT INTO "${tab}" (`;
  return new Promise((fres, frej) => {
    strm.on('error', frej);
    strm.on('data', (val) => z=addRow(val, z, ++i));
    strm.on('end', () => {
      z = z.replace(/\),\n\($/, '')+')';
      if(opt.pk) z += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
      fres(z+';\n');
    });
  });
}

/**
 * Generates SQL command for INSERT INTO.
 * @param {string} tab table name
 * @param {Array<object>} vals row objects {column: value}
 * @param {object} opt options {pk}
 * @param {string} opt.pk primary key, on conflict (null => none)
 * @param {string} z please dont use
 * @returns {string} SQL command
 */
function insertInto(tab, vals, opt={}, z='') {
  var i = -1;
  z += `INSERT INTO "${tab}" (`;
  for(var val of vals)
    z = addRow(val, z, ++i);
  z = z.replace(/\),\n\($/, '')+')';
  if(opt.pk) z += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
  return z+';\n';
}
insertInto.stream = insertIntoStream;


function tsvector(cols) {
  var z = '';
  for(var k in cols)
    if(cols[k]) z += `setweight(to_tsvector('english', "${k}"), '${cols[k]}')||`;
  return z.replace(/\|\|$/, '');
}

function setupTableIndex(nam, cols, opt={}, z='') {
  if(opt.tsvector) {
    var tv = tsvector(opt.tsvector);
    z += createView(nam+'_tsvector', `SELECT *, ${tv} AS "tsvector" FROM "${nam}"`);
    if(opt.index) z += createIndex(nam+'_tsvector_idx', nam, `(${tv})`, {method: 'GIN'});
  }
  if(opt.index) {
    for(var k in cols) {
      if(cols[k]==null || k===opt.pk) continue;
      var knam = k.replace(/\W+/g, '_').toLowerCase();
      z += createIndex(`${nam}_${knam}_idx`, nam, `"${k}"`);
    }
  }
  return z;
}

/**
 * Generates SQL commands to setup table (create, insert, index).
 * @param {string} nam table name
 * @param {object} cols columns {name: type}
 * @param {Array<object>} vals row objects {column: value}
 * @param {object} opt options for createTable/View/Index/, insertInto
 * @param {string} z please dont use
 */
function setupTable(nam, cols, vals=null, opt={}, z='') {
  z = createTable(nam, cols, opt, z);
  if(vals) z = insertInto(nam, vals, opt, z);
  return setupTableIndex(nam, cols, opt, z);
}
setupTable.index = setupTableIndex;


/**
 * Generates SQL command for table exists check.
 * @param {string} nam table name
 * @returns {string} SQL command
 */
function tableExists(nam) {
  return `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${nam}');\n`;
}


/**
 * Generates SQL command for SELECT with tsquery.
 * @param {string} tab table name
 * @param {string} qry plain query words
 * @param {string} tsv tsvector ("tsvector")
 * @param {object} opt options {columns, order, limit, normalization}
 * @param {string} opt.columns select columns (*)
 * @param {boolean} opt.order order rows? (false)
 * @param {number} opt.limit limit rows (0 => no)
 * @param {number} opt.normalization rank normalization (0 => ignores the document length)
 * @returns {string} SQL command
 */
function selectTsquery(tab, qry, tsv='"tsvector"', opt={}) {
  var col = opt.columns||'*', nrm = opt.normalization||0;
  var z = `SELECT ${col} FROM "${tab}" WHERE ${tsv} @@ plainto_tsquery('${qry}')`;
  if(opt.order) z += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${qry}'), ${nrm}) DESC`;
  if(opt.limit) z += ` LIMIT ${opt.limit}`;
  z += `;\n`;
  return z;
}


/**
 * Generates SQL query for matching words with tsquery.
 * @param {string} tab table name
 * @param {Array<string>} wrds match words
 * @param {string} tsv tsvector ("tsvector")
 * @param {object} opt options {columns, order, limit, normalization}
 * @param {string} opt.columns select columns (*)
 * @param {boolean} opt.order order rows? (false)
 * @param {number} opt.limit limit rows (0 => no)
 * @param {number} opt.normalization rank normalization (0 => ignores the document length)
 * @returns {string} SQL command
 */
function matchTsquery(tab, wrds, tsv='"tsvector"', opt={}) {
  var col = opt.columns||'*', nrm = opt.normalization||0;
  for(var i=wrds.length, z=''; i>0; i--) {
    var qry = wrds.slice(0, i).join(' ').replace(/([\'\"])/g, '$1$1');
    z += `SELECT ${col}, '${i}'::INT AS "matchTsquery" FROM "${tab}"`;
    z += ` WHERE ${tsv} @@ plainto_tsquery('${qry}')`;
    if(opt.order) z += ` ORDER BY ts_rank(${tsv}, plainto_tsquery('${qry}'), ${nrm}) DESC`;
    z += ' UNION ALL\n';
  }
  z = z.substring(0, z.length-11);
  if(opt.limit) z += ` LIMIT ${opt.limit}`;
  z += ';\n';
  return z;
}

function _format(obj, fmt, sep, i, val) {
  var a = [], ve = val instanceof Array;
  var i = i||(ve? val.length : 0);
  for(var k in obj) {
    var v = obj[k];
    a.push(fmt.replace(/%k/g, k).replace(/%v/g, v).replace(/%i/g, i++));
    if(ve) val.push(v);
  }
  return a.join(sep);
}

function _array(x) {
  if(x instanceof Array) return x;
  if(x==null || typeof x==='string' || typeof x[Symbol.iterator]!=='function') return [x];
  return Array.from(x);
}

function createTableData(tab, col, key) {
  return {'query':
    `CREATE TABLE IF NOT EXISTS "${tab}" (`+
    `${_format(col, '"%k" %v')}`+
    (key? `,PRIMARY KEY(${_format(_array(key), '"%v"')})` : ``)+`);`
  };
}

function updateData(tab, set, whr, op, sep) {
  var par = [], set = _format(set||{}, '"%k" = $%i', `, `, 1, par);
  var exp = _format(whr||{}, `"%k" ${op||'='} $%i`, ` ${sep||'AND'} `, par.length+1, par);
  return {'query': `UPDATE "${tab}" SET ${set}${exp? ' WHERE '+exp : ''};`, 'data': par};
}

function selectData(tab, whr, op, sep) {
  var par = [], exp = _format(whr||{}, `"%k" ${op||'='} $%i`, ` ${sep||'AND'} `, 1, par);
  return {'query': `SELECT * FROM "${tab}"${exp? ' WHERE '+exp : ''};`, 'data': par};
}

function insertIntoData(tab, vals) {
  var par = [], into = _format(vals||{}, '"%k"', `, `, 1, par), vals = _format(par, '$%i', ', ', 1);
  return {'query': `INSERT INTO "${tab}" (${into}) VALUES (${vals});`, 'data': par};
}

function deleteData(tab, whr, op, sep) {
  var par = [], exp = _format(whr||{}, `"%k" ${op||'='} $%i`, ` ${sep||'AND'} `, 1, par);
  return {'query': `DELETE FROM "${tab}"${exp? ' WHERE '+exp : ''};`, 'data': par};
}
exports.OPERATORS = OPERATORS;
exports.OPERAND_COUNT = OPERAND_COUNT;
exports.createTable = createTable;
exports.createIndex = createIndex;
exports.createView = createView;
exports.insertInto = insertInto;
exports.setupTable = setupTable;
exports.tableExists = tableExists;
exports.selectTsquery = selectTsquery;
exports.matchTsquery = matchTsquery;
