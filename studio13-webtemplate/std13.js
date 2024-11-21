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
// Middleware-ek
app.use(express.json()); // JSON adatok feldolgozása
app.use(express.urlencoded({ extended: true })); // URL-encoded adatok feldolgozása




app.post('/logout', (req, res) => {
  session_data = req.session;
  session_data.destroy(function (err) {
    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.json('Sikeres kijelentkezés');
    res.end();
  });
});

// Bejelentkezés POST kérés kezelése
app.post('/login', (req, res) => {
  session_data = req.session;

  // Ellenőrizzük, hogy a felhasználó már be van-e jelentkezve
  if (session_data && session_data.NEV) {
    // Ha a felhasználó már be van jelentkezve, hibát küldünk
    res.set('Content-Type', 'application/json; charset=UTF-8');
    return res.json({
      count: 0,
      error: `Hiba: Már be van jelentkezve mint ${session_data.NEV}!`,
    });
  }

  // Bejelentkezési adatok lekérdezése
  var user = (req.query.user1_login_field ? req.query.user1_login_field : "");
  var psw = (req.query.user1_passwd_field ? req.query.user1_passwd_field : "");
  var sql = `select ID_OPERATOR, LOGIN, NEV FROM operator WHERE NEV='Adminisztrátor' AND PASSWORD=md5('${psw}')`;

  // SQL lekérdezés futtatása és adatok kezelése
  DB.query(sql, napló(req), (json_data, error) => {
    var data = error ? error : JSON.parse(json_data);
    console.log(util.inspect(data, false, null, true)); // Teljes objektum kiírása

    if (!error && data.count === 1) {
      // Sikeres bejelentkezés: munkamenet adatok beállítása
      session_data = req.session;
      session_data.ID_OPERATOR = data.rows[0].ID_OPERATOR || "N/A";
      session_data.LOGIN = data.rows[0].LOGIN || "N/A";
      session_data.NEV = data.rows[0].NEV || "N/A";
      session_data.MOST = Date.now();
      console.log("Bejelentkezett felhasználó: %s (ID_OPERATOR=%s)", session_data.NEV, session_data.ID_OPERATOR);

      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(data);
    } else {
      // Hibás bejelentkezés
      data = { error: 'Sikertelen bejelentkezés: Hibás felhasználónév vagy jelszó' };
      res.set('Content-Type', 'application/json; charset=UTF-8');
      res.send(data);
    }
    res.end();
  });
});

// Kijelentkezés POST kérés kezelése
app.post('/logout', (req, res) => {
  session_data = req.session;
  session_data.destroy(function(err) {
    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.json('Sikeres kijelentkezés');
    res.end();
  });
});

// Az oldal újratöltésekor a munkamenetet nem töröljük
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: __dirname + '/public' }); // A főoldal betöltése
});

// Új végpont a munkamenet ellenőrzésére
app.get('/checkSession', (req, res) => {
  session_data = req.session;
  if (session_data && session_data.NEV) {
    // Ha van érvényes munkamenet, visszaküldjük a felhasználó adatait
    res.json({ NEV: session_data.NEV });
  } else {
    // Ha nincs érvényes munkamenet, üres választ küldünk
    res.json({});
  }
});

app.get('/', (req, res) => {
  if (req.session) {
    req.session.destroy(); // Munkamenet törlése újratöltéskor
  }
  res.sendFile('index.html', { root: __dirname + '/public' }); // A főoldal betöltése
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
  const patientName = req.query.name;
  res.sendFile(__dirname + '/public/presencePage.html');
});



// Új végpont a napok számokkal történő kiírásához
app.get('/getTreatmentDays', (req, res) => {
  const name = req.query.name;
  console.log("Keresett páciens neve:", name);

  // SQL lekérdezés a napok lekérésére
  const query = `
    SELECT 
        (ellatas.HO) AS hónap,
        ellatas.NAPOK
    FROM 
        ellatas 
    JOIN 
        paciensek ON ellatas.ID_PACIENS = paciensek.ID_PACIENS
    WHERE 
        paciensek.NEV = '${name}';

  `;
  console.log("Lekérdezés:", query);

  // Lekérdezés futtatása
  DB.query(query, [], (results, err) => {
    //console.log(err);
    //console.log(results); 
      if (err) {
          // Pontos adatbázishiba megjelenítése a konzolban
          //console.error('Adatbázis hiba történt:', err.message); // Hiba üzenet a részletekkel
          return res.status(500).json({ error: 'Adatbázis hiba', details: err.message });
      }

      if (results.length === 0) {
          // Üres találat kezelése
          //console.warn(`Nem található páciens a megadott névvel: ${name}`);
          return res.status(404).json({ error: `Nem található páciens a megadott névvel: ${name}` });
      }
      var anyad11 = JSON.parse(results);
     console.log(anyad11.rows);
      // Sikeres lekérdezés esetén napok visszaküldése
      const daysString = anyad11.rows[0].napok;
      res.json({ days: anyad11.rows});
  });
});

/*
// Új végpont a napok számokkal történő kiírásához
app.post('/addTreatmentDays', (req, res) => {
  const { name, hónap, napok } = req.body;

  if (!name || !hónap || !napok) {
      return res.status(400).json({ success: false, message: 'Hiányzó paraméterek!' });
  }

  const query = `
      INSERT INTO ellatas (ID_PACIENS, HO, NAPOK)
      SELECT ID_PACIENS, '${hónap}', ${napok}
      FROM paciensek
      WHERE NEV = '${name}';
  `;

  DB.query(query, (error) => {
      if (error) {
          console.error('Adatbázis hiba:', error);
          return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
      }

      res.json({ success: true, message: 'Új hónap sikeresen hozzáadva!' });
  });
});

*/

app.post('/checkAndFillMonth', (req, res) => {
  const { taj } = req.body;

  if (!taj) {
      console.error('Nincs TAJ szám a kérésben!');
      return res.status(400).json({ success: false, message: 'TAJ szám szükséges!' });
  }

  console.log('Kapott TAJ:', taj);

  // SQL lekérdezés
  const getLastMonthQuery = `
      SELECT ellatas.HO AS hónap, ellatas.NAPOK
      FROM ellatas
      JOIN paciensek ON ellatas.ID_PACIENS = paciensek.ID_PACIENS
      WHERE paciensek.TAJ = '${taj}'
      ORDER BY ellatas.HO DESC
      LIMIT 1;
  `;

  // Adatbázis lekérdezés
  DB.query(getLastMonthQuery, [], (results, err) => {
      if (err) {
          console.error('Adatbázis hiba a legutolsó hónap lekérdezésénél:', err);
          return res.status(500).json({ success: false, message: 'Adatbázis hiba!' });
      }

      console.log('Legutolsó hónap eredménye:', results);

      const rows = results.rows || results.rows || results; // Támogatás több formátumhoz

      // Ellenőrzés, hogy vannak-e adatok
      if (!rows || rows.length === 0 || !rows[0].NAPOK) {
          console.warn('Nincs adat vagy NAPOK mező hiányzik a TAJ számhoz:', taj);
          return res.status(404).json({ success: false, message: 'Nincs adat vagy hiányos adatok!' });
      }

      // Adatok feldolgozása
      const lastMonth = rows[0].hónap;
      const lastDays = rows[0].NAPOK;
      console.log(rows[0].NAPOK);

      console.log('Legutolsó hónap:', lastMonth, 'NAPOK:', lastDays);

      // Ellenőrzés az NAPOK mezőre
      if (typeof lastDays !== 'string') {
          console.error('NAPOK mező nem szöveges formátum:', lastDays);
          return res.status(500).json({ success: false, message: 'Hibás adatformátum!' });
      }

      const lastDigit = lastDays.slice(-1); // Utolsó nap számjegye
      const today = new Date();
      const todayDay = today.getDate();

      const nextMonth = parseInt(lastMonth) + 1; // Következő hónap kiszámítása
      const newMonth = nextMonth.toString().padStart(2, '0');
      const newDays = lastDigit.repeat(todayDay);

      console.log('Új hónap:', newMonth, 'Új napok:', newDays);

      // Új hónap beszúrása
      const insertNewMonthQuery = `
          INSERT INTO ellatas (ID_PACIENS, HO, NAPOK)
          SELECT ID_PACIENS, '${newMonth}', '${newDays}'
          FROM paciensek
          WHERE TAJ = '${taj}';
      `;

      DB.query(insertNewMonthQuery, [], (insertErr) => {
          if (insertErr) {
              console.error('Hiba az új hónap hozzáadása során:', insertErr);
              return res.status(500).json({ success: false, message: 'Hiba történt a hónap hozzáadása során.' });
          }

          res.json({ success: true, message: `Új hónap (${newMonth}) sikeresen hozzáadva ${todayDay} nappal.` });
      });
  });
});





/* ---------------------------- log 'fájl' naplózás ------------------  */
function napló (req) {
  var userx = "- no login -";
  session_data = req.session;
  if (session_data.ID_OPERATOR) {  userx = session_data.NEV; } 
  return [ userx, req.socket.remoteAddress ];
}




app.listen(port, function () { console.log(`std13 app listening at http://localhost:${port}`); });