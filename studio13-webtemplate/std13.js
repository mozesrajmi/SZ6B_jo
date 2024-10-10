/* 
   Bootstrap5  (https://www.w3schools.com/bootstrap5/) ; 
   mysql tábla megjelenítése; katt eseményre rekord megjelenítése; popup ablakban rekord módosítás 
   SQL tokenizer
*/

const util = require('util');
const express = require('express');
const session = require('express-session');
const app    = express();
const port   = 3000;
var session_data;                   // login user adatai
app.use(session({ key:'user_sid', secret:'nagyontitkossütemény', resave:true, saveUninitialized:true }));  /* https://www.js-tutorials.com/nodejs-tutorial/nodejs-session-example-using-express-session */
var DB  = require('./datamodule_mysql.js');
app.use(express.static('public'));    // frontend root mappa (index.html)





app.post('/logout',   (req, res) => {  
  session_data = req.session;
  session_data.destroy(function(err) {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.json('Sikres kijelentkezés');
      res.end();
    }); 
});

app.post('/login',  (req, res) => {       
  var user= (req.query.user1_login_field? req.query.user1_login_field: "");
  var psw = (req.query.user1_passwd_field? req.query.user1_passwd_field  : "");
  var sql = `select ID_OPERATOR, LOGIN, NEV FROM operator WHERE NEV='Adminisztrátor' AND PASSWORD=md5('${psw}')`;

  DB.query(sql, napló(req), (json_data, error) => {
    var data = error ? error : JSON.parse(json_data); 
    console.log(util.inspect(data, false, null, true)); // teljes objektum kiírása
    
    if (!error && data.count === 1) { // sikeres bejelentkezés
        session_data = req.session;
        session_data.ID_OPERATOR = data.rows[0].ID_OPERATOR || "N/A"; // ha nincs, 'N/A'-t állítunk be
        session_data.LOGIN = data.rows[0].LOGIN || "N/A";
        session_data.NEV = data.rows[0].NEV || "N/A";
        session_data.MOST = Date.now();
        console.log("Bejelentkezett felhasználó: %s (ID_OPERATOR=%s)", session_data.NEV, session_data.ID_OPERATOR);
    } else {
        data = { error: 'Sikertelen bejelentkezés: Hibás felhasználónév vagy jelszó' }; // hibaüzenet
    }

    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data);
    res.end();
  });
});

/* --- mysql pool technikával, json formátumban visszaküldi a kliensnek az adathalmazt: restapi ----*/
 
 function Send_to_JSON (req, res, sql) {
  DB.query(sql, napló(req), (json_data, error) => {
    let data = error ? error : JSON.parse( json_data ); 
    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data);
    res.end();
  });
}

/* ----------------------------tablazatfeltoltes------------------  */

// Adatok lekérése MySQL adatbázisból és visszaadása JSON formátumban
app.get('/getData', (req, res) => {
  const sql = "SELECT NEV, TAJ, DATE_FORMAT(SZULDATUM, \"%Y.%m.%d\") AS SZULDATUM FROM paciensek";
  
  DB.query(sql, napló(req), (json_data, error) => {
      let data = error ? error : JSON.parse(json_data);  // MySQL eredmények JSON formátumban
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(data);  // Adatok küldése a kliensnek
      res.end();
  });
});

app.get('/presencePage', (req, res) => {
  res.send(`
    <h1>Jelenlét Oldal</h1>
<img src="/images/prev-32.png" alt="Previous" id="prevButton" style="cursor: pointer;">
<script>
  document.getElementById('prevButton').addEventListener('click', function() {
  window.history.back();
  });
</script>
  `);
});


/* ---------------------------- log 'fájl' naplózás ------------------  */
function napló (req) {
  var userx = "- no login -";
  session_data = req.session;
  if (session_data.ID_OPERATOR) {  userx = session_data.NEV; } 
  return [ userx, req.socket.remoteAddress ];
}




app.listen(port, function () { console.log(`std13 app listening at http://localhost:${port}`); });