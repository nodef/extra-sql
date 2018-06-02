// 0. @sql-extra/createindex (createIndex)
function createIndex(nam, tab, exp, opt={}) {
  var z = `CREATE INDEX IF NOT EXISTS "${nam}" ON "${tab}" `;
  if(opt.method) z += `USING ${opt.method} `;
  return z+`(${exp});\n`;
};
// 1. @sql-extra/createtable (createTable)
function createTable(nam, cols, opt={}) {
  var z = `CREATE TABLE IF NOT EXISTS "${nam}" (`;
  for(var k in cols)
    z += `"${k}" ${cols[k]}, `;
  if(opt.pk) z += `PRIMARY KEY("${opt.pk}"), `;
  return z.replace(/, $/, '')+`);\n`;
};
// 2. @sql-extra/createview (createView)
function createView(nam, qry) {
  return `CREATE OR REPLACE VIEW "${nam}" AS ${qry};\n`;
};
// 3. @sql-extra/insertinto (insertInto)
function addRow3(val, z='', i=0) {
  if(i===0) {
    for(var k in val)
      z += `"${k}", `;
    z = z.endsWith(', ')? z.substring(0, z.length-2):z;
    z += ') VALUES\n(';
  }
  for(var k in val)
    z += `'${val[k]}', `;
  z = z.endsWith(', ')? z.substring(0, z.length-2):z;
  z += '),\n(';
  return z;
};
function stream3(tab, strm, opt={}) {
  var i = -1, z = `INSERT INTO "${tab}" (`;
  return new Promise((fres, frej) => {
    strm.on('error', frej);
    strm.on('data', (val) => z=addRow3(val, z, ++i));
    strm.on('end', () => {
      z = z.replace(/\),\n\($/, '')+')';
      if(opt.pk) z += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
      fres(z+';\n');
    });
  });
};
function insertInto(tab, vals, opt={}) {
  var i = -1, z = `INSERT INTO "${tab}" (`;
  for(var val of vals)
    z = addRow3(val, z, ++i);
  z = z.replace(/\),\n\($/, '')+')';
  if(opt.pk) z += `\nON CONFLICT ("${opt.pk}") DO NOTHING`;
  return z+';\n';
};
insertInto.stream = stream3;
// 4. @sql-extra/setuptable (setupTable)
function index4(nam, cols, opt={}, z='') {
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
};
function setupTable(nam, cols, vals=null, opt={}, z='') {
  z += createTable(nam, cols, opt);
  if(vals) z += insertInto(nam, vals, opt);
  return index4(nam, cols, opt, z);
};
setupTable.index = index4;
// 5. @sql-extra/tableexists (tableExists)
function tableExists(nam) {
  return `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${nam}');\n`;
};
// 6. @sql-extra/tsvector (tsvector)
function tsvector(cols) {
  var z = '';
  for(var k in cols)
    if(cols[k]) z += `setweight(to_tsvector('english', "${k}"), '${cols[k]}')||`;
  return z.replace(/\|\|$/, '');
};
exports.createIndex = createIndex;
exports.createTable = createTable;
exports.createView = createView;
exports.insertInto = insertInto;
exports.setupTable = setupTable;
exports.tableExists = tableExists;
exports.tsvector = tsvector;
