/* https://stackoverflow.com/questions/18496540/node-js-mysql-connection-pooling
   https://adi22maurya.medium.com/mysql-createconnection-vs-mysql-createpool-in-node-js-42a5274626e7
   https://tecadmin.net/configuring-mysql-connection-pooling-in-node-js/

   példa: webfejl_nodejs_példa_62
*/

const util = require('util');
var mysql = require("mysql");

var pool = mysql.createPool({
    connectionLimit : 250,
    host    : '193.227.198.214',
    user    : 'user',
    port    : "3306",
    password: 'almaspite8888',     
    database: 'studio13_gondozohaz',
});

const getConnection = function () {
    return new Promise((resolve, reject) => {
        pool.getConnection((error, con) => {
            if (error) {
                reject(error);
            } else {
                resolve(con);
            }
        });
    });
};

var DB = (function () {
    function _query(sql, params, callback) {
        getConnection()
            .then((connection) => {
                // Ensure 'error' listener is added only once
                if (!connection._events || !connection._events.error) {
                    connection.on('error', (err) => {
                        connection.release();
                        callback(null, JSON.stringify(err));
                    });
                }

                var worlds = sql.trim().toUpperCase().split(" ");
                var isSelect = worlds[0] === "SELECT";
                var limit_poz = worlds.lastIndexOf("LIMIT");
                var limit = limit_poz > -1 ? worlds[limit_poz + 1] * 1 : -1;
                var offset_poz = worlds.lastIndexOf("OFFSET");
                var offset = offset_poz > -1 ? ((worlds[offset_poz + 1] * 1) / limit) | 0 : -1;
                var maxcount = 0;

                if (isSelect && limit > 0) {
                    let poz = sql.toUpperCase().lastIndexOf("ORDER BY ");
                    if (poz < 0) {
                        poz = sql.toUpperCase().lastIndexOf("LIMIT ");
                    }
                    let sqlcount = "select count(*) as db from (" + sql.substring(0, poz) + ") as tabla;";
                    connection.query(sqlcount, params, (err, rows) => {
                        if (!err) {
                            rows = JSON.parse(JSON.stringify(rows));
                            maxcount = rows[0].db;
                        }
                    });
                }

                connection.query(sql, params, (err, rows) => {
                    connection.release();

                    var js;
                    if (!err) {
                        if (isSelect) {
                            let reccount = rows.length;
                            let pages = Math.floor(maxcount / limit) + (maxcount % limit >= 1 ? 1 : 0);
                            js = {
                                "text": 0,
                                "tip": reccount > 0 ? "info" : "warning",
                                "count": reccount,
                                "maxcount": maxcount,
                                "limit": limit,
                                "offset": offset,
                                "pages": pages,
                                "rows": rows
                            };
                        } else {
                            const templ = { "INSERT": "Bevitel", "UPDATE": "Módosítás", "DELETE": "Törlés" };
                            js = rows;
                            js["count"] = js["affectedRows"];
                            js["tip"] = js["count"] == 0 ? "warning" : "info";
                            js["text"] = templ[worlds[0]] + ": " + js["count"] + " rekord.";
                        }
                        callback(JSON.stringify(js));
                    } else {
                        js = { "text": "[" + err.errno + "]  --> " + err.sqlMessage, "tip": "error" };
                        callback(null, JSON.stringify(js));
                    }

                    // Logging to "napló" table
                    var text_naplo = js.text ? "TEXT:" + js.text : "";
                    var sql_naplo = `insert into naplo (USER, URL, SQLX) values ("${params[0]}","${params[1]}","${sql.replaceAll("\"", "'")} ${text_naplo}");`;
                    connection.query(sql_naplo, null, (errx, rowsx) => {});
                });
            })
            .catch((err) => {
                callback(null, JSON.stringify(err));
            });
    }

    return { query: _query };
})();

module.exports = DB;



  