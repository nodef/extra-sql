[SQL] is designed for managing or stream processing data in an RDBMS. This package provides a set of functions to generate SQL commands for creating tables, inserting data, and performing various operations, including text search and matching, on SQL databases (PostgreSQL).

▌
📦 [JSR](https://jsr.io/@nodef/extra-sql),
📰 [Docs](https://jsr.io/@nodef/extra-sql/doc),

<br>


```javascript
import * as xsql from "jsr:@nodef/extra-sql";

xsql.tableExists("food");
// → SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='food');

xsql.setupTable("food", {code: "TEXT", name: "TEXT"},
  [{code: "F1", name: "Mango"}, {code: "F2", name: "Lychee"}]);
// → CREATE TABLE IF NOT EXISTS "food" ("code" TEXT, "name" TEXT);
// → INSERT INTO "food" ("code", "name") VALUES
// → ($$F1$$, $$Mango$$),
// → ($$F2$$, $$Lychee$$);


xsql.selectTsquery("columns", "total fat");
// → SELECT * FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat');

xsql.matchTsquery("columns", ["total", "fat"]);
// → SELECT *, '2'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total fat') UNION ALL
// → SELECT *, '1'::INT AS "matchTsquery" FROM "columns" WHERE "tsvector" @@ plainto_tsquery('total');
```


## Index

| Name | Description |
| ---- | ------ |
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


[![](https://raw.githubusercontent.com/qb40/designs/gh-pages/0/image/11.png)](https://wolfram77.github.io)<br>
[![ORG](https://img.shields.io/badge/org-nodef-green?logo=Org)](https://nodef.github.io)
![](https://ga-beacon.deno.dev/G-RC63DPBH3P:SH3Eq-NoQ9mwgYeHWxu7cw/github.com/nodef/extra-sql)


[SQL]: https://en.wikipedia.org/wiki/SQL
[createTable]: https://jsr.io/@nodef/extra-sql/doc/~/createTable
[createIndex]: https://jsr.io/@nodef/extra-sql/doc/~/createIndex
[createView]: https://jsr.io/@nodef/extra-sql/doc/~/createView
[insertInto]: https://jsr.io/@nodef/extra-sql/doc/~/insertInto
[setupTable]: https://jsr.io/@nodef/extra-sql/doc/~/setupTable
[tableExists]: https://jsr.io/@nodef/extra-sql/doc/~/tableExists
[selectTsquery]: https://jsr.io/@nodef/extra-sql/doc/~/selectTsquery
[matchTsquery]: https://jsr.io/@nodef/extra-sql/doc/~/matchTsquery
[OPERATORS]: https://jsr.io/@nodef/extra-sql/doc/~/OPERATORS
[OPERAND_COUNT]: https://jsr.io/@nodef/extra-sql/doc/~/OPERAND_COUNT
[insertIntoStream]: https://jsr.io/@nodef/extra-sql/doc/~/insertIntoStream
[setupTableIndex]: https://jsr.io/@nodef/extra-sql/doc/~/setupTableIndex
[createTableData]: https://jsr.io/@nodef/extra-sql/doc/~/createTableData
[updateData]: https://jsr.io/@nodef/extra-sql/doc/~/updateData
[selectData]: https://jsr.io/@nodef/extra-sql/doc/~/selectData
[insertIntoData]: https://jsr.io/@nodef/extra-sql/doc/~/insertIntoData
[deleteData]: https://jsr.io/@nodef/extra-sql/doc/~/deleteData
