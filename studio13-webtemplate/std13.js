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

    if (!error && data.count === 1) {
      // Sikeres bejelentkezés: munkamenet adatok beállítása
      session_data = req.session;
      session_data.ID_OPERATOR = data.rows[0].ID_OPERATOR || "N/A";
      session_data.LOGIN = data.rows[0].LOGIN || "N/A";
      session_data.NEV = data.rows[0].NEV || "N/A";
      session_data.MOST = Date.now();

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

  // Lekérdezés futtatása
  DB.query(query, [], (results, err) => {
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

// Új végpont az adott páciens ID-jének lekéréséhez TAJ alapján
app.get('/getPatientIdByTaj', (req, res) => {
  const taj = req.query.taj; // TAJ lekérése a query paraméterekből
  if (!taj) {
      return res.status(400).json({ error: 'A TAJ szám hiányzik!' });
  }

  const sql = `SELECT ID_PACIENS FROM paciensek WHERE TAJ = '${taj}' LIMIT 1`;

  DB.query(sql, [], (json_data, error) => {
      const data = error ? null : JSON.parse(json_data);
      if (error || !data || data.rows.length === 0) {
          return res.status(404).json({ error: 'Nem található páciens a megadott TAJ számmal!' });
      }
      const id = data.rows[0].ID_PACIENS;
      res.json({ id });
  });
});

// Új végpont az adott páciens ID-jének lekéréséhez TAJ alapján
app.get('/getPatientIdByTaj', (req, res) => {
  const taj = req.query.taj; // TAJ lekérése a query paraméterekből
  if (!taj) {
      return res.status(400).json({ error: 'A TAJ szám hiányzik!' });
  }

  const sql = `SELECT ID_PACIENS FROM paciensek WHERE TAJ = '${taj}' LIMIT 1`;

  DB.query(sql, [], (json_data, error) => {
      const data = error ? null : JSON.parse(json_data);
      if (error || !data || data.rows.length === 0) {
          return res.status(404).json({ error: 'Nem található páciens a megadott TAJ számmal!' });
      }
      const id = data.rows[0].ID_PACIENS;
      res.json({ id });
  });
});

app.get('/getLastMonthAndDays', (req, res) => {
  const { id } = req.query; // Az ID-t lekérjük a query paraméterekből
  if (!id) {
      return res.status(400).json({ error: 'Páciens ID szükséges!' });
  }

  const sql = `
      SELECT 
          HO AS hónap, 
          NAPOK
      FROM 
          ellatas
      WHERE 
          ID_PACIENS = '${id}'
      ORDER BY 
          HO DESC
      LIMIT 1;
  `;

  DB.query(sql, [], (json_data, error) => {
      const data = error ? null : JSON.parse(json_data);
      if (error || !data || data.rows.length === 0) {
          return res.status(404).json({ error: 'Nem található ellátási adat a megadott ID-hez!' });
      }

      const lastMonth = data.rows[0].hónap;
      const daysString = data.rows[0].NAPOK;

      // A napok utolsó számjegyének meghatározása
      const lastDigit = daysString ? daysString.slice(-1) : null;

      res.json({ lastMonth, lastDigit });
  });
});

app.post('/fillMissingMonths', (req, res) => {
  const { id } = req.body; // Páciens ID-t a kérésből olvassuk ki
  if (!id) {
      return res.status(400).json({ error: 'Páciens ID szükséges!' });
  }

  // Lekérjük a legutolsó hónapot és napok utolsó számjegyét
  const getLastMonthQuery = `
      SELECT 
          HO AS hónap, 
          NAPOK
      FROM 
          ellatas
      WHERE 
          ID_PACIENS = '${id}'
      ORDER BY 
          HO DESC
      LIMIT 1;
  `;

  DB.query(getLastMonthQuery, [], (json_data, error) => {
      if (error) {
          console.error('Adatbázis hiba a legutolsó hónap lekérdezésénél:', error);
          return res.status(500).json({ error: 'Adatbázis hiba!' });
      }

      const data = JSON.parse(json_data);
      if (data.rows.length === 0) {
          return res.status(404).json({ error: 'Nincs ellátási adat ehhez az ID-hez!' });
      }

      const lastMonth = parseInt(data.rows[0].hónap, 10);
      const lastDigit = data.rows[0].NAPOK.slice(-1);

      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // JavaScript hónapok 0-tól indexeltek
      const todayDay = today.getDate();


      // Ha nincsenek hiányzó hónapok, nincs teendő
      if (lastMonth >= currentMonth) {
          return res.json({ success: true, message: 'Nincs hiányzó hónap.' });
      }

      const newRecords = [];
      for (let month = lastMonth + 1; month <= currentMonth; month++) {
          const monthStr = month.toString().padStart(2, '0');

          // Meghatározzuk az adott hónap napjainak számát
          const daysInMonth = new Date(currentYear, month, 0).getDate();

          // Ha a jelenlegi hónap, akkor csak a mai dátumig töltjük fel
          const daysStr = lastDigit.repeat(month === currentMonth ? todayDay : daysInMonth);

          newRecords.push([id, monthStr, daysStr]);
      }


      // Tömeges beszúrás az új hónapokra
      const insertQuery = `
          INSERT INTO ellatas (ID_PACIENS, HO, NAPOK)
          VALUES ${newRecords.map(record => `('${record[0]}', '${record[1]}', '${record[2]}')`).join(', ')}; 
      `;

      DB.query(insertQuery, [], (insertResult, insertErr) => {
        if (insertErr) {
            console.error('Hiba az új hónap(ok) hozzáadása során:', insertErr);
            return res.status(500).json({ success: false, message: 'Hiba történt a hónap(ok) hozzáadása során.' });
        }
    
        // Ellenőrizzük a beszúrás eredményét
        if (insertResult.affectedRows > 0) {
            res.json({ success: true, message: `Hiányzó hónapok sikeresen létrehozva (${lastMonth + 1} - ${currentMonth}).` });
        } else {
            console.warn('Nem történt beszúrás. Lehet, hogy a hónapok már léteztek.');
            res.json({ success: true, message: 'Nem történt új hónapok létrehozása, mert már léteztek.' });
        }
    });    
  });
});


app.get('/getLastMonthAndDays', (req, res) => {
    const { id } = req.query; // Az ID-t lekérjük a query paraméterekből
    if (!id) {
        return res.status(400).json({ error: 'Páciens ID szükséges!' });
    }

    const sql = `
        SELECT 
            HO AS lastMonth, 
            NAPOK AS lastDigit
        FROM 
            ellatas
        WHERE 
            ID_PACIENS = '${id}'
        ORDER BY 
            HO DESC
        LIMIT 1;
    `;

    DB.query(sql, [], (json_data, error) => {
        const data = error ? null : JSON.parse(json_data);
        if (error || !data || data.rows.length === 0) {
            return res.status(404).json({ error: 'Nem található ellátási adat a megadott ID-hez!' });
        }

        const lastMonth = data.rows[0].lastMonth;
        const lastDigit = data.rows[0].lastDigit;
        res.json({ lastMonth, lastDigit });
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