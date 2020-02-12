[SQL] is designed for managing or stream processing data in an RDBMS.
Includes SQL command generation functions, with a few for text matching (PostgreSQL).

```javascript
const sql = require('extra-sql');

sql.tableExists('food');
// SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');

sql.setupTable('food', {code: 'TEXT', name: 'TEXT'},
  [{code: 'F1', name: 'Mango'}, {code: 'F2', name: 'Lychee'}]);
// CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
// INSERT INTO "food" ("code", "name") VALUES
// ('F1', 'Mango'),
// ('F2', 'Lychee');

sql.selectTsquery('columns', 'total fat');
// SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');

sql.matchTsquery('columns', ['total', 'fat']);
// SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
// SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total'); 
```

### reference

| Name                | Action
|---------------------|-------
| [createTable]       | Generates SQL command for CREATE TABLE.
| [createIndex]       | Generates SQL command for CREATE INDEX.
| [createView]        | Generates SQL command for CREATE VIEW.
| [insertInto]        | Generates SQL command for INSERT INTO.
| [setupTable]        | Generates SQL commands to setup table (create, insert, index).
| [tableExists]       | Generates SQL command for table exists check.
| [selectTsquery]     | Generates SQL command for SELECT with tsquery.
| [matchTsquery]      | Generates SQL query for matching words with tsquery.
| [OPERATORS]         | Set of operators in SQL. {field}
| [OPERAND_COUNT]     | Number of operands used with an SQL operator. {field}

<br>
<br>

[![nodef](https://merferry.glitch.me/card/extra-sql.svg)](https://nodef.github.io)

[createTable]: https://github.com/nodef/extra-sql/wiki/createTable
[createIndex]: https://github.com/nodef/extra-sql/wiki/createIndex
[createView]: https://github.com/nodef/extra-sql/wiki/createView
[insertInto]: https://github.com/nodef/extra-sql/wiki/insertInto
[setupTable]: https://github.com/nodef/extra-sql/wiki/setupTable
[tableExists]: https://github.com/nodef/extra-sql/wiki/tableExists
[selectTsquery]: https://github.com/nodef/extra-sql/wiki/selectTsquery
[matchTsquery]: https://github.com/nodef/extra-sql/wiki/matchTsquery
[OPERATORS]: https://github.com/nodef/extra-sql/wiki/OPERATORS
[OPERAND_COUNT]: https://github.com/nodef/extra-sql/wiki/OPERAND_COUNT
[SQL]: https://en.wikipedia.org/wiki/SQL
