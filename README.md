SQL is designed for managing or stream processing data in an RDBMS.

```javascript
const extra = require('sql-extra');
// extra.createTable(<name>, <columns>, [options])
// extra.createIndex(<name>, <table>, <expression>, [options])
// ...
```

Methods:
- [createTable](https://www.npmjs.com/package/@sql-extra/createtable)
- [createIndex](https://www.npmjs.com/package/@sql-extra/createindex)
- [createView](https://www.npmjs.com/package/@sql-extra/createview)
- [insertInto](https://www.npmjs.com/package/@sql-extra/insertinto)
- [setupTable](https://www.npmjs.com/package/@sql-extra/setuptable)
- [tableExists](https://www.npmjs.com/package/@sql-extra/tableexists)
- [selectTsquery](https://www.npmjs.com/package/@sql-extra/selecttsquery)
- [matchTsquery](https://www.npmjs.com/package/@sql-extra/matchtsquery)
