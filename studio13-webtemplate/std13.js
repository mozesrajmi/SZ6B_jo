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



//npm install node-schedule mysql


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

// Adatok lekérése MySQL adatbázisból és visszaadása JSON formátumban bővített státusszal
// Adatok lekérése MySQL adatbázisból és visszaadása JSON formátumban, státusszal
app.get('/getDataWithStatus', (req, res) => {
  const sql = `
    SELECT 
      NEV, 
      TAJ, 
      DATE_FORMAT(SZULDATUM, "%Y.%m.%d") AS SZULDATUM,
      STATUS
    FROM paciensek
  `;

  DB.query(sql, napló(req), (json_data, error) => {
    let data = error ? error : JSON.parse(json_data);  // MySQL eredmények JSON formátumban
    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data);  // Adatok küldése a kliensnek
    res.end();
  });
});

//varakozo
app.get('/getWaitingData', (req, res) => {
  const sql = `
    SELECT 
      NEV, 
      TAJ, 
      DATE_FORMAT(SZULDATUM, "%Y.%m.%d") AS SZULDATUM,
      STATUS
    FROM paciensek
    WHERE STATUS = 'Várakozó'
  `;

  DB.query(sql, napló(req), (json_data, error) => {
    if (error) {
      res.status(500).json({ error: 'Adatbázis hiba történt', details: error });
      return;
    }

    let data;
    try {
      data = JSON.parse(json_data); // Parse MySQL results to JSON format
    } catch (err) {
      res.status(500).json({ error: 'JSON feldolgozási hiba', details: err });
      return;
    }

    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data); // Send filtered data back to the client
  });
});


//előgondozott
app.get('/getPreCareData', (req, res) => {
  const sql = `
    SELECT 
      NEV, 
      TAJ, 
      DATE_FORMAT(SZULDATUM, "%Y.%m.%d") AS SZULDATUM,
      STATUS
    FROM paciensek
    WHERE STATUS = 'Előgondozott'
  `;

  DB.query(sql, napló(req), (json_data, error) => {
    if (error) {
      res.status(500).json({ error: 'Adatbázis hiba történt', details: error });
      return;
    }

    let data;
    try {
      data = JSON.parse(json_data); // Parse MySQL results to JSON format
    } catch (err) {
      res.status(500).json({ error: 'JSON feldolgozási hiba', details: err });
      return;
    }

    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data); // Send filtered data back to the client
  });
});

// ellátott
app.get('/getCareData', (req, res) => {
  const sql = `
    SELECT 
      NEV, 
      TAJ, 
      DATE_FORMAT(SZULDATUM, "%Y.%m.%d") AS SZULDATUM,
      STATUS
    FROM paciensek
    WHERE STATUS = 'ellátott'
  `;

  DB.query(sql, napló(req), (json_data, error) => {
    if (error) {
      res.status(500).json({ error: 'Adatbázis hiba történt', details: error });
      return;
    }

    let data;
    try {
      data = JSON.parse(json_data); // Parse MySQL results to JSON format
    } catch (err) {
      res.status(500).json({ error: 'JSON feldolgozási hiba', details: err });
      return;
    }

    res.set('Content-Type', 'application/json; charset=UTF-8');
    res.send(data); // Send filtered data back to the client
  });
});

//távozott
app.get('/getLeftData', (req, res) => {
  const sql = `
      SELECT NEV, TAJ, DATE_FORMAT(SZULDATUM, '%Y-%m-%d') AS SZULDATUM, STATUS
      FROM paciensek
      WHERE STATUS = 'Távozott'
  `;

  DB.query(sql, (err, results) => {
      if (err) {
          console.error('Error fetching "Távozott" data:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt.' });
      }

      res.json({ rows: results });
  });
});

/*
//mentés státusz és ido és datum
app.post('/updateStatus', (req, res) => {
  const { id, status, timestamp } = req.body;

  if (!id || !status || !timestamp) {
      return res.status(400).json({ error: 'Hiányzó adatok!' });
  }

  // Construct SQL query with variable interpolation
  const sql = `
      UPDATE paciensek
      SET STATUS = '${status}', ELOGOND_DATUM = '${timestamp}'
      WHERE TAJ = '${id}'
  `;

  DB.query(sql, (err, results) => {
      if (err) {
          console.error('Database update error:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt.' });
      }

      res.json({ success: true, message: 'Státusz sikeresen frissítve!' });
  });
});
*/
/*HATALMAStesztek*/
app.post('/updateStatus', (req, res) => {
  const { id, status, timestamp, year, month, day } = req.body;

  if (!id || !status || !timestamp || !year || !month || !day) {
      console.log('Hiányzó adatok!', { id, status, timestamp, year, month, day });
      return res.status(400).json({ error: 'Hiányzó adatok!' });
  }

  // Meghatározzuk, hogy melyik dátum mezőt kell frissíteni az új státusz alapján
  let dateField = '';
  if (status === 'Előgondozott') {
      dateField = `ELOGOND_DATUM = '${timestamp}',`;
  } else if (status === 'Ellátott') {
      dateField = `ELLATOTT_DATUM = '${timestamp}',`;
  } else if (status === 'Távozott') {
      dateField = `TAVOZOTT_DATUM = '${timestamp}',`;
  }

  // Frissítsük a paciensek táblát az új státusszal és adott dátum mezővel
  const updatePaciensekSql = `
      UPDATE paciensek
      SET STATUS = '${status}', ${dateField} ELOGOND_DATUM = ELOGOND_DATUM
      WHERE TAJ = '${id}'
  `;

  DB.query(updatePaciensekSql, [], (updateResult, updateErr) => {
      if (updateErr) {
          console.error('Hiba a paciensek tábla frissítésekor:', updateErr);
          return res.status(500).json({ error: 'Adatbázis hiba történt a státusz frissítése során.' });
      }

      console.log('Paciensek tábla sikeresen frissítve.');

      // Csak akkor frissítjük az ellatas tábla adatait, ha az új státusz "Ellátott"
      if (status === 'Ellátott') {
          // Töltsük ki a napok mezőt
          const daysArray = Array(day - 1).fill('0').join('') + '1';

          const updateEllatasSql = `
              INSERT INTO ellatas (ID_PACIENS, EV, HO, NAPOK)
              SELECT ID_PACIENS, ${year}, ${month}, '${daysArray}'
              FROM paciensek
              WHERE TAJ = '${id}'
              ON DUPLICATE KEY UPDATE NAPOK = '${daysArray}'
          `;

          DB.query(updateEllatasSql, [], (ellatasResult, ellatasErr) => {
              if (ellatasErr) {
                  console.error('Hiba az ellatas tábla frissítésekor:', ellatasErr);
                  return res.status(500).json({ error: 'Adatbázis hiba történt az ellatas táblázat frissítése során.' });
              }

              console.log('Ellátás tábla sikeresen frissítve.');
              res.json({ success: true, message: 'Státusz és ellátás adatai sikeresen frissítve!' });
          });
      } else {
          res.json({ success: true, message: 'Státusz sikeresen módosítva!' });
      }
  });
});







const schedule = require('node-schedule');

// Napi feladat ütemezése éjfélkor
schedule.scheduleJob('0 0 * * *', () => {
    console.log('Napi Napok frissítés indítása...');

    // SQL lekérdezés az "Ellátott" státuszú rekordokhoz
    const selectQuery = `
        SELECT paciensek.ID_PACIENS, ellatas.EV, ellatas.HO, ellatas.NAPOK
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE paciensek.STATUS = 'Ellátott'
    `;

    DB.query(selectQuery, (err, results) => {
        if (err) {
            console.error('Hiba az "Ellátott" rekordok lekérdezésekor:', err);
            return;
        }

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // Hónap (1 alapú)
        const maxDaysInMonth = new Date(currentYear, currentMonth, 0).getDate(); // Hónap napjainak száma

        results.forEach(record => {
            const { ID_PACIENS, EV, HO, NAPOK } = record;

            if (HO !== currentMonth || EV !== currentYear) {
                // Csak az aktuális hónapot frissítjük
                console.log(`Rekord kihagyva: ID_PACIENS=${ID_PACIENS}, EV=${EV}, HO=${HO}`);
                return;
            }

            // Ellenőrizzük, hogy van-e még hely az adott hónapra
            if (NAPOK.length >= maxDaysInMonth) {
                console.log(`Hónap tele: ID_PACIENS=${ID_PACIENS}, EV=${EV}, HO=${HO}`);
                return;
            }

            // Az utolsó számjegy alapján új nap érték hozzáadása (0–3 tartományban)
            const lastDayValue = NAPOK.slice(-1); // Utolsó számjegy
            const updatedNapok = NAPOK + lastDayValue; // Új érték

            console.log(`Frissítés: ID_PACIENS=${ID_PACIENS}, Új NAPOK=${updatedNapok}`);

            // Frissítjük az adatbázist
            const updateQuery = `
                UPDATE ellatas
                SET NAPOK = '${updatedNapok}'
                WHERE ID_PACIENS = ${ID_PACIENS} AND EV = ${currentYear} AND HO = ${currentMonth}
            `;

            DB.query(updateQuery, (err) => {
                if (err) {
                    console.error(`Hiba a NAPOK frissítésekor: ID_PACIENS=${ID_PACIENS}`, err);
                } else {
                    console.log(`Sikeres frissítés: ID_PACIENS=${ID_PACIENS}`);
                }
            });
        });
    });
});




app.get('/presencePage', (req, res) => {
  const patientName = req.query.name;
  res.sendFile(__dirname + '/public/presencePage.html');
});

app.get('/status', (req, res) => {
  const patientName = req.query.name;
  res.sendFile(__dirname + '/public/status.html');
});

app.get('/fizetesprog', (req, res) => {
  const patientName = req.query.name;
  res.sendFile(__dirname + '/public/fizetesprog.html');
});

// Új végpont a napok számokkal történő kiírásához
// Új végpont a napok számokkal történő kiírásához
app.get('/getTreatmentDays', (req, res) => {
  const id = req.query.id; // ID a query paraméterből

  if (!id) {
      return res.status(400).json({ error: 'A páciens ID hiányzik!' });
  }

  const query = `
      SELECT 
          ellatas.HO AS hónap, 
          ellatas.NAPOK
      FROM 
          ellatas
      INNER JOIN 
          paciensek 
      ON 
          ellatas.ID_PACIENS = paciensek.ID_PACIENS
      WHERE 
          ellatas.ID_PACIENS = ${id}
          AND paciensek.ELOGOND_DATUM IS NOT NULL
  `;

  DB.query(query, [], (json_data, error) => {
      if (error) {
          console.error('Adatbázis hiba történt:', error.message);
          return res.status(500).json({ error: 'Adatbázis hiba', details: error.message });
      }

      const data = JSON.parse(json_data);

      if (!data.rows.length) {
          return res.status(404).json({ error: 'Ehhez a pácienshez nem tartoznak ellátási napok.' });
      }

      res.json({ days: data.rows });
  });
});


app.post('/updateDayValue', (req, res) => {
  const { id, day, newValue, month } = req.body;

  if (!id || !day || newValue === undefined || !month) {
      return res.status(400).json({ error: 'Hiányzó paraméterek!' });
  }

  const sql = `
      UPDATE ellatas
      SET NAPOK = CONCAT(
          SUBSTRING(NAPOK, 1, ${day - 1}),
          '${newValue}',
          SUBSTRING(NAPOK, ${day + 1})
      )
      WHERE ID_PACIENS = ${id} AND HO = ${month}
  `;

  DB.query(sql, (err, result) => {
      if (err) {
          console.error('Hiba a nap értékének frissítése során:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt!' });
      }

      res.json({ success: true, message: 'Nap értéke sikeresen frissítve!' });
  });
});











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


/*
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
*/

// Új végpont a státusz lekérdezésére TAJ szám alapján
// Új végpont a státusz lekérdezésére ID alapján
app.get('/getStatusById', (req, res) => {
  const id = req.query.id; // ID-t kérjük a query paraméterből

  if (!id) {
      return res.status(400).json({ error: 'A páciens ID hiányzik!' });
  }

  // SQL lekérdezés az ID alapján
  const sql = `SELECT STATUS FROM paciensek WHERE ID_PACIENS = '${id}' LIMIT 1`;

  DB.query(sql, [], (json_data, error) => {
      if (error) {
          console.error('Adatbázis hiba:', error);
          return res.status(500).json({ error: 'Adatbázis hiba történt.' });
      }

      const data = JSON.parse(json_data);
      if (data.rows.length === 0) {
          return res.status(404).json({ error: 'Nem található páciens a megadott ID-val!' });
      }

      const status = data.rows[0].STATUS;
      res.json({ status }); // Státusz visszaküldése
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