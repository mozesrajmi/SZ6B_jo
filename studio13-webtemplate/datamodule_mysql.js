/* https://stackoverflow.com/questions/18496540/node-js-mysql-connection-pooling
   https://adi22maurya.medium.com/mysql-createconnection-vs-mysql-createpool-in-node-js-42a5274626e7
   https://tecadmin.net/configuring-mysql-connection-pooling-in-node-js/

   példa: webfejl_nodejs_példa_62
*/

const util = require('util');
var mysql = require("mysql");

var pool = mysql.createPool({
    connectionLimit : 10,
    host    : '193.227.198.214',
    user    : 'gombos_gergo',
    port    : "9306",
    password: 'Csany4140',     /*  !!! node.js leáll a connection hibákra !!! (Query hibára ok.)  */ 
    database: '2020_gombos_gergo'
});

const getConnection =function () {
    return new Promise((resolve, reject) => {
        pool.getConnection((error, con) => {
            if (error) { reject( error); }
            else       { resolve(con);   }
        });
    });
}

var DB = (function () {
    function _query(sql, params, callback) {
        getConnection()
        .then((connection)=>{
            var worlds = sql.trim().toUpperCase().split(" ");
            var isSelect = worlds[0] === "SELECT";
            var limit_poz = worlds.lastIndexOf("LIMIT");             /* ORDER BY után kell csak keresni */
            var limit = limit_poz > -1? worlds[limit_poz+1]*1 : -1;  /* order by x limit 100 offset 200 */
            var offset_poz = worlds.lastIndexOf("OFFSET");
            var offset = offset_poz > -1? ((worlds[offset_poz+1]*1) / limit) | 0 : -1; 
            var maxcount = 0;   
            if (isSelect && limit > 0) {                                          /* maxcount keresése (limit nélkül mennyi lenne?) */
                let poz = sql.toUpperCase().lastIndexOf("ORDER BY ");             // nem kell az order by (ha van)
                if (poz < 0) { poz = sql.toUpperCase().lastIndexOf("LIMIT "); }   // nem kell a limit (ha van)
                let sqlcount = "select count(*) as db from ("+sql.substring(0, poz)+") as tabla;"; 
                connection.query(sqlcount, params, function (err, rows) { 
                    rows = JSON.parse(JSON.stringify(rows));
                    maxcount = rows[0].db; 
                });    
            }
            connection.query(sql, params, function (err, rows) {
                connection.release();
                var js;
                if (!err) { 
                    if (isSelect) {                                            /* select .... */        
                        let reccount = rows.length;
                        let pages = Math.floor(maxcount / limit) + (maxcount % limit >= 1 ? 1:0);
                        js = { "text"  : 0, 
                               "tip"      : reccount > 0? "info" : "warning", 
                               "count"    : reccount,         /* limit reccount   */ 
                               "maxcount" : maxcount,         /* no limit reccount */
                               "limit"    : limit,            /* akt.  limit */
                               "offset"   : offset,           /* akt. offset */
                               "pages"    : pages,            /* max. lapok száma */ 
                               "rows"     : rows }            /* rekordok, pl: json.rows[i].ID */
                    } else  { 
                        const templ = { "INSERT": "Bevitel", "UPDATE": "Módosítás", "DELETE": "Törlés"}; 
                        js = rows ;                           /* insert, update, delete (+DDLsql) {fieldCount:, affectedRows:,insertId:,serverStatus:,warningCount:,message:,protocol41:,changedRows:} */
                        js["count"]   = js["affectedRows"];
                        js["tip"]     = js["count"]== 0? "warning": "info"; 
                        js["text"]    = templ[worlds[0]]+": "+js["count"]+" rekord." ;   
                    }        
                    callback (JSON.stringify( js ));   
                }
                else { 
                    js = { "text" : "["+err.errno+"]  --> " + err.sqlMessage,  "tip" : "error"};
                    callback( null, JSON.stringify( js ));
                }

                /*  ------------  napló konzolra és "napló" táblába -----------------*/
                var text_naplo = "";
                if (js.text) { 
                    text_naplo = "TEXT:"+js.text;
                } 
                var sql_naplo = `insert into naplo (USER, URL, SQLX) values ("${params[0]}","${params[1]}","${sql.replaceAll("\"","'")} ${text_naplo}");`;  // fields=USER, URL, SQLX, DATETIME (timestamp)
                connection.query(sql_naplo, null, function (errx, rowsx) {  });
            });

            connection.on('error', function (err) {
                connection.release();
                callback(null, JSON.stringify(err));
            });
        })
        .catch((err) => {  callback(null, JSON.stringify(err)); })
    }
    
    return { query: _query };
}) ();

module.exports = DB;


  