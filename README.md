[SQL] is designed for managing or stream processing data in an RDBMS. This package provides a set of functions to generate SQL commands for creating tables, inserting data, and performing various operations, including text search and matching, on SQL databases (currently PostgreSQL).

▌
📦 [Node.js](https://www.npmjs.com/package/extra-sql),
🌐 [Web](https://www.npmjs.com/package/extra-sql.web),
📜 [Files](https://unpkg.com/extra-sql/),
📰 [Docs](https://nodef.github.io/extra-sql/),
📘 [Wiki](https://github.com/nodef/extra-sql/wiki/).

<br>


```javascript
import * as xsql from 'extra-sql';

xsql.tableExists('food');
// → SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');

xsql.setupTable('food', {code: 'TEXT', name: 'TEXT'},
  [{code: 'F1', name: 'Mango'}, {code: 'F2', name: 'Lychee'}]);
// → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
// → INSERT INTO "food" ("code", "name") VALUES
// → ($$F1$$, $$Mango$$),
// → ($$F2$$, $$Lychee$$);


xsql.selectTsquery('columns', 'total fat');
// → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');

xsql.matchTsquery('columns', ['total', 'fat']);
// → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
// → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
```


## Index

| Property | Description |
|  ----  |  ----  |
| [createTable] | Generate SQL command for CREATE TABLE. |
| [createIndex] | Generate SQL command for CREATE INDEX. |
| [createView] | Generate SQL command for CREATE VIEW. |
| [insertInto] | Generates SQL command for INSERT INTO using an array of values. |
| [setupTable] | Generate SQL commands to set up a table (create, insert, index). |
| [tableExists] | Generate SQL command to check if a table exists. |
| [selectTsquery] | Generate SQL command for SELECT with tsquery. |
| [matchTsquery] | Generate SQL query for matching words with tsquery. |
| [insertIntoStream] | Generate SQL command for INSERT INTO using a stream of values. |
| [setupTableIndex] | Generate SQL commands for setting up table indexes and views. |
| [createTableData] | Generate SQL command for creating a table with data. |
| [updateData] | Generate SQL command for updating data. |
| [selectData] | Generate SQL command for selecting data. |
| [insertIntoData] | Generate SQL command for inserting data. |
| [deleteData] | Generate SQL command for deleting data. |
| [OPERATORS] | Set of operators in SQL. {field} |
| [OPERAND_COUNT] | Number of operands used with an SQL operator. {field} |

<br>
<br>


[![](https://img.youtube.com/vi/u6EuAUjq92k/maxresdefault.jpg)](https://www.youtube.com/watch?v=u6EuAUjq92k)<br>
[![ORG](https://img.shields.io/badge/org-nodef-green?logo=Org)](https://nodef.github.io)
![](https://ga-beacon.deno.dev/G-RC63DPBH3P:SH3Eq-NoQ9mwgYeHWxu7cw/github.com/nodef/extra-sql)


[SQL]: https://en.wikipedia.org/wiki/SQL
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
[insertIntoStream]: https://github.com/nodef/extra-sql/wiki/insertIntoStream
[setupTableIndex]: https://github.com/nodef/extra-sql/wiki/setupTableIndex
[createTableData]: https://github.com/nodef/extra-sql/wiki/createTableData
[updateData]: https://github.com/nodef/extra-sql/wiki/updateData
[selectData]: https://github.com/nodef/extra-sql/wiki/selectData
[insertIntoData]: https://github.com/nodef/extra-sql/wiki/insertIntoData
[deleteData]: https://github.com/nodef/extra-sql/wiki/deleteData
