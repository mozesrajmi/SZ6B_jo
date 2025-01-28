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
//const port   = 9062;
var session_data;                   // login user adatai
app.use(session({ key:'user_sid', secret:'nagyontitkossütemény', resave:true, saveUninitialized:true }));  /* https://www.js-tutorials.com/nodejs-tutorial/nodejs-session-example-using-express-session */
var DB  = require('./datamodule_mysql.js');
app.use(express.static('public'));    // frontend root mappa (index.html)
// Middleware-ek
app.use(express.json()); // JSON adatok feldolgozása
app.use(express.urlencoded({ extended: true })); // URL-encoded adatok feldolgozása


//npm install node-schedule mysql


app.post("/logout", (req, res) => {
  session_data = req.session;

  if (!session_data || !session_data.NEV) {
    // User is not logged in
    res.set("Content-Type", "application/json; charset=UTF-8");
    return res.json("Hiba: Nincs bejelentkezve, kijelentkezés sikertelen.");
  }

  // Destroy session if user is logged in
  session_data.destroy(function (err) {
    res.set("Content-Type", "application/json; charset=UTF-8");
    res.json("Sikeres kijelentkezés");
    res.end();
  });
});

// Bejelentkezés POST kérés kezelése
// Bejelentkezés POST kérés kezelése
app.post('/login', (req, res) => {
    session_data = req.session;
  
    // Ellenőrizzük, hogy a felhasználó már be van-e jelentkezve
    if (session_data && session_data.NEV) {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      return res.json({
        count: 0,
        error: `Hiba: Már be van jelentkezve mint ${session_data.NEV}!`,
      });
    }
  
    // Bejelentkezési adatok lekérdezése
    var user = (req.query.user1_login_field ? req.query.user1_login_field.trim() : "");
    var psw = (req.query.user1_passwd_field ? req.query.user1_passwd_field.trim() : "");
  
    // Mindkét mező ellenőrzése
    if ((!user || user === "") && (!psw || psw === "")) {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      return res.json({
        count: 0,
        error: "Hiba: A felhasználó nevet és a jelszót kötelező tölteni!",
      });
    }
  
    // Felhasználónév ellenőrzése
    if (!user || user === "") {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      return res.json({
        count: 0,
        error: "Hiba: A felhasználónév nem lehet üres!",
      });
    }
  
    // Jelszó ellenőrzése
    if (!psw || psw === "") {
      res.set('Content-Type', 'application/json; charset=UTF-8');
      return res.json({
        count: 0,
        error: "Hiba: A jelszó megadása kötelező!",
      });
    }
  
    // SQL lekérdezés az azonosításhoz
    var sql = `SELECT ID_OPERATOR, LOGIN, NEV 
               FROM operator 
               WHERE LOGIN='${user}' AND PASSWORD=md5('${psw}')`;
  
    // SQL futtatás és eredmény kezelése
    DB.query(sql, napló(req), (json_data, error) => {
      var data = error ? error : JSON.parse(json_data);
  
      if (!error && data.count === 1) {
        session_data = req.session;
        session_data.ID_OPERATOR = data.rows[0].ID_OPERATOR || "N/A";
        session_data.LOGIN = data.rows[0].LOGIN || "N/A";
        session_data.NEV = data.rows[0].NEV || "N/A";
        session_data.MOST = Date.now();
  
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send(data);
      } else {
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
  
        // Ellenőrizzük, hogy a státusz "Sürgős Várakozó"-ról "Előgondozott"-ra vált
        if (status === 'Előgondozott') {
            const checkUrgentSql = `
                SELECT SURGOS_VARAKOZO
                FROM paciensek
                WHERE TAJ = '${id}' AND SURGOS_VARAKOZO = 'Y'
            `;
  
            DB.query(checkUrgentSql, [], (urgentResult, urgentErr) => {
                if (urgentErr) {
                    console.error('Hiba a sürgős státusz ellenőrzésekor:', urgentErr);
                    return;
                }
  
                if (urgentResult.length > 0) {
                    // Ha sürgős várakozó, állítsuk át a `surgos_varakozo` mezőt "N"-re
                    const updateUrgentSql = `
                        UPDATE paciensek
                        SET SURGOS_VARAKOZO = 'N'
                        WHERE TAJ = '${id}'
                    `;
  
                    DB.query(updateUrgentSql, [], (urgentUpdateResult, urgentUpdateErr) => {
                        if (urgentUpdateErr) {
                            console.error('Hiba a sürgős státusz frissítésekor:', urgentUpdateErr);
                        } else {
                            console.log('Sürgős státusz sikeresen átállítva "N"-re.');
                        }
                    });
                }
            });
        }
  
        // Csak akkor frissítjük az ellatas tábla adatait, ha az új státusz "Ellátott"
        if (status === 'Ellátott') {
            const fetchPensionSql = `
                SELECT NYUGDIJ FROM paciensek WHERE TAJ = '${id}'`;
            console.log('SQL Lekérdezés:', fetchPensionSql);
  
            DB.query(fetchPensionSql, [], (pensionResult, pensionErr) => {
                if (pensionErr) {
                    console.error('Hiba a nyugdíj lekérdezésekor:', pensionErr);
                } else {
                    console.log('Lekérdezés eredménye (eredeti):', pensionResult);
  
                    let rows;
                    if (typeof pensionResult === 'string') {
                        try {
                            const parsedResult = JSON.parse(pensionResult);
                            rows = parsedResult.rows || [];
                        } catch (parseError) {
                            console.error('Hiba a lekérdezés eredményének feldolgozása során:', parseError);
                            rows = [];
                        }
                    } else {
                        rows = pensionResult.rows || [];
                    }
  
                    console.log('Lekérdezés eredménye (feldolgozott):', rows);
  
                    if (rows.length > 0 && rows[0].NYUGDIJ !== undefined) {
                        const pension = parseFloat(rows[0].NYUGDIJ);
                        const daysInYear = (new Date(year, 11, 31) - new Date(year, 0, 0)) / (1000 * 60 * 60 * 24);
                        const dailyFee = Math.floor((pension * 0.6) * 12 / daysInYear);
  
                        console.log(`Nyugdíj összege: ${pension}`);
                        console.log(`Éves napok száma: ${daysInYear}`);
                        console.log(`Napidíj képlete: Math.floor((${pension} * 0.6) * 12 / ${daysInYear})`);
                        console.log(`Napidíj: ${dailyFee}`);
  
                        console.log(`Páciens ID: ${id}, Nyugdíj: ${pension}, Napidíj: ${dailyFee}`);
  
                        // Frissítsük a napidíjat az adatbázisban
                        const updateDailyFeeSql = `
                            UPDATE ellatas
                            SET NAPIDIJ = ${dailyFee}
                            WHERE ID_PACIENS = (SELECT ID_PACIENS FROM paciensek WHERE TAJ = '${id}')
                        `;
  
                        DB.query(updateDailyFeeSql, [], (updateDailyFeeResult, updateDailyFeeErr) => {
                            if (updateDailyFeeErr) {
                                console.error('Hiba a napidíj frissítésekor:', updateDailyFeeErr);
                            } else {
                                console.log('Napidíj sikeresen frissítve az adatbázisban.');
                            }
                        });
                    } else {
                        console.log(`Páciens ID: ${id}, nyugdíj érték nem található vagy üres.`);
                    }
                }
            });
  
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
  


// Endpoint to get napidij for a patient
app.get('/getNapidij', (req, res) => {
  const patientId = req.query.id; // Retrieve the patient ID from query parameters

  if (!patientId) {
      return res.status(400).json({ error: 'A páciens ID hiányzik!' });
  }

  const query = `
      SELECT NAPIDIJ
      FROM ellatas
      WHERE ID_PACIENS = '${patientId}'
      LIMIT 1;
  `;

  DB.query(query, (err, results) => {
      if (err) {
          console.error('Adatbázis hiba a napidij lekérdezésekor:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt.' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'A páciens napidíja nem található!' });
      }

      const napidij = results[0].NAPIDIJ;
      res.json({ napidij });
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
  const id = req.query.id; 
  const year = req.query.year || new Date().getFullYear(); 

  if (!id) {
      return res.status(400).json({ error: 'Páciens ID megadása kötelező!' });
  }

  const query = `
      SELECT 
          HO AS hónap, 
          NAPOK 
      FROM 
          ellatas 
      WHERE 
          ID_PACIENS = '${id}' 
          AND EV = '${year}'
      ORDER BY HO ASC;
  `;

  DB.query(query, (err, results) => {
      if (err) {
          console.error('Adatbázis hiba:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt!' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Nincs adat a kiválasztott évhez!' });
      }

      res.json({ days: results });
  });
});




app.post('/updateDayValue', (req, res) => {
  const { id, day, newValue, month, year } = req.body;

  if (!id || !day || newValue === undefined || !month || !year) {
      return res.status(400).json({ error: 'Hiányzó paraméterek!' });
  }

  const sql = `
      UPDATE ellatas
      SET NAPOK = CONCAT(
          SUBSTRING(NAPOK, 1, ${day - 1}),
          '${newValue}',
          SUBSTRING(NAPOK, ${day + 1})
      )
      WHERE ID_PACIENS = ${id} AND HO = ${month} AND EV = ${year}
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


// Új végpont: Kezelési napok lekérése adott évre
app.get('/getTreatmentDaysByYear', (req, res) => {
  const id = req.query.id; // Páciens ID
  const year = req.query.year; // Kiválasztott év

  // Ellenőrzések
  if (!id || !year) {
      return res.status(400).json({ error: 'Páciens ID és év megadása kötelező!' });
  }

  // SQL lekérdezés: évszűrés
  const query = `
      SELECT 
          HO AS hónap, 
          NAPOK 
      FROM 
          ellatas 
      WHERE 
          ID_PACIENS = '${id}' 
          AND EV = '${year}'
      ORDER BY HO ASC;
  `;

  // Lekérdezés futtatása
  DB.query(query, (err, results) => {
      if (err) {
          console.error('Adatbázis hiba a kezelési napok lekérdezésekor:', err);
          return res.status(500).json({ error: 'Adatbázis hiba történt!' });
      }

      if (results.length === 0) {
          return res.status(404).json({ error: 'Nincs adat a kiválasztott évre!' });
      }

      // Eredmény visszaadása
      res.json({ days: results });
  });
});

                                                            //tesztafafadfdasfasdfasdfadsfafafafafaf
// Havi zárás ütemezése minden hónap elsején hajnali 1 órakor
schedule.scheduleJob('0 1 1 * *', () => {
  console.log('Havi zárás indítása...');
  const currentDate = new Date();
  const previousMonth = currentDate.getMonth() === 0 ? 12 : currentDate.getMonth();
  const year = previousMonth === 12 ? currentDate.getFullYear() - 1 : currentDate.getFullYear();

  // Lekérdezés az összes páciensre, aki rendelkezik ellátási adatokkal az előző hónapból
  const closeMonthQuery = `
      SELECT 
          ID_PACIENS, 
          HO, 
          EV, 
          NAPOK,
          NAPIDIJ
      FROM ellatas
      WHERE HO = '${previousMonth}' AND EV = '${year}';
  `;

  DB.query(closeMonthQuery, (err, results) => {
      if (err) {
          console.error('Havi zárás hiba:', err);
          return;
      }

      if (results.length === 0) {
          console.log('Nincsenek ellátási adatok feldolgozandó páciensekhez.');
          return;
      }

      results.forEach(row => {
          const napok = row.NAPOK.split('');
          let totalCost = 0;
          let yearlyHospitalDays = 0;
          let yearlyReservedDays = 0;

          napok.forEach((status, index) => {
              let dailyCost = row.NAPIDIJ;

              if (status === '0') {
                  dailyCost = 0; // Set daily cost to 0 for status '0'
              } else if (status === '2') { // Kórházban
                  yearlyHospitalDays++;
                  dailyCost *= yearlyHospitalDays >= 40 ? 0.4 : 0.2;
              } else if (status === '3') { // Helyfoglalás
                  yearlyReservedDays++;
                  dailyCost *= yearlyReservedDays >= 40 ? 0.6 : 0.2;
              }

              totalCost += dailyCost;
          });

          // FIZETENDO mező frissítése
          const updateQuery = `
              UPDATE ellatas
              SET FIZETENDO = '${totalCost}'
              WHERE ID_PACIENS = '${row.ID_PACIENS}' AND HO = '${previousMonth}' AND EV = '${year}';
          `;

          DB.query(updateQuery, updateErr => {
              if (updateErr) {
                  console.error(`Hiba a ${row.ID_PACIENS} páciens adatainak frissítése során:`, updateErr);
              } else {
                  console.log(`Havi zárás sikeresen lefutott: Páciens ID: ${row.ID_PACIENS}`);
              }
          });
      });

      console.log(`Havi zárás lezárva. Feldolgozott páciensek száma: ${results.length}`);
  });
});

// Újraszámolás végpont
app.post('/recalculate', (req, res) => {
  const { id, year, month } = req.body;

  if (!id || !year || !month) {
      return res.status(400).json({ error: 'Hiányzó paraméterek!' });
  }

  const recalculateQuery = `
      SELECT 
          NAPOK,
          NAPIDIJ
      FROM ellatas
      WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}';
  `;

  DB.query(recalculateQuery, (err, results) => {
      if (err) {
          console.error('Újraszámolás hiba:', err);
          return res.status(500).json({ error: 'Adatbázis hiba!' });
      }

      let totalCost = 0;
      let yearlyHospitalDays = 0;
      let yearlyReservedDays = 0;
      const detailedCosts = [];

      results.forEach(row => {
          const napok = row.NAPOK.split('');
          napok.forEach((status, index) => {
              let dailyCost = row.NAPIDIJ;

              if (status === '0') {
                  dailyCost = 0; // Set daily cost to 0 for status '0'
              } else if (status === '2') { // Kórházban
                  yearlyHospitalDays++;
                  dailyCost *= yearlyHospitalDays >= 40 ? 0.4 : 0.2;
              } else if (status === '3') { // Helyfoglalás
                  yearlyReservedDays++;
                  dailyCost *= yearlyReservedDays >= 40 ? 0.6 : 0.2;
              }

              totalCost += dailyCost;
              detailedCosts.push({ day: index + 1, status, dailyCost });
          });
      });

      res.json({ 
          success: true, 
          totalCost, 
          details: detailedCosts, 
          yearlyHospitalDays, 
          yearlyReservedDays
      });
  });
});

/* ---------------------------- sürgős várakozás van e ------------------  */
app.get('/getUrgentData', (req, res) => {
    const sql = `
        SELECT NEV, TAJ,  DATE_FORMAT(SZULDATUM, "%Y.%m.%d") AS SZULDATUM, STATUS
        FROM paciensek
        WHERE STATUS = 'várakozó' AND SURGOS_VARAKOZO = 'Y'
    `;
    DB.query(sql, (error, results) => {
        if (error) {
            console.error('Error fetching urgent data:', error);
            res.status(500).json({ error: 'Database query failed' });
        } else {
            res.json({ rows: results });
        }
    });
});



app.get('/getLastDayStatus', (req, res) => {
    const statusFilter = req.query.status || 'ellátott'; // Alapértelmezett státusz az "ellátott"

    const sql = `
        SELECT 
            paciensek.NEV, 
            paciensek.TAJ, 
            RIGHT(ellatas.NAPOK, 1) AS LAST_DAY_STATUS
        FROM paciensek
        INNER JOIN ellatas 
            ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE paciensek.STATUS = '${statusFilter}'
          AND ellatas.EV = YEAR(CURDATE()) 
          AND ellatas.HO = MONTH(CURDATE())
    `;

    DB.query(sql, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({ rows: results });
    });
});

app.get('/getEllatottPatients', (req, res) => {
    const sql = `
         SELECT distinct NEV, TAJ
        FROM paciensek
        INNER JOIN ellatas
        ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE paciensek.STATUS = 'ellátott';
    `;

    DB.query(sql, (err, results) => {
        if (err) {
            console.error('Hiba az adatbázis-lekérdezés során:', err);
            res.status(500).json({ error: 'Adatbázis hiba történt!' });
        } else {
            res.json(results);
        }
    });
});

let x = 0
// Új végpont a fizetéshez
app.get('/getFizetendoById', (req, res) => {
    const { id, year, month } = req.query;
    // Ellenőrizzük, hogy a szükséges paraméterek jelen vannak
    if (!id || !year || !month) {
        res.status(400).json({ error: 'Hiányzó paraméterek! (id, év, hónap szükséges)' });
    }else{
        // SQL lekérdezés létrehozása
        const sql = `
            SELECT FIZETENDO 
            FROM ellatas 
            WHERE ID_PACIENS = ${id} AND EV = ${year} AND HO = ${month} 
            LIMIT 1
        `;
        // Adatbázis lekérdezés
        DB.query(sql, napló(req), (results, err) => {
            x++
            results = JSON.parse(results);
            const fizetendo = results.rows ? results.rows[0]?.FIZETENDO:undefined; // Biztonságos hozzáférés
            if (err) {
                res.status(500).json({ error: 'Adatbázis hiba történt!' });
            }
    
            // Ellenőrizzük az eredményt
            else if (!results || results.length === 0) {
                res.status(404).json({ error: 'Nincs ilyen ID-hoz tartozó adat az adott évre és hónapra!' });
            }
            else if (!fizetendo) {
                res.status(500).json({ error: 'Nem található FIZETENDO érték az eredményben!' });
            }else{
                res.json({ fizetendo });
            }
    
            // Küldjük vissza a megfelelő választ
        });
    }

});
app.post('/savePayment', (req, res) => {

    const { id, amount, year, month } = req.body;

    // Ellenőrzés: ha nincs `id`, hibát dobunk
    if (!id) {
        return res.status(400).json({ error: 'Hiányzó páciens ID!' });
    }

    // Ellenőrzés a `paciensek` táblában
    const checkPatientSql = `SELECT 1 FROM paciensek WHERE ID_PACIENS = '${id}' LIMIT 1;`;

    DB.query(checkPatientSql, (err, result) => {
        if (err) {
            console.error('Adatbázis hiba a páciens ellenőrzésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: 'A megadott ID_PACIENS nem található a paciensek táblában!' });
        }

        // Folytasd az `ellatas` tábla frissítését, ha a páciens létezik
        const sql = `
            INSERT INTO ellatas (ID_PACIENS, EV, HO, FIZETETT) 
            VALUES ('${id}', ${year}, ${month}, ${amount}) 
            ON DUPLICATE KEY UPDATE 
            FIZETETT = ${amount};
        `;

        DB.query(sql, (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Adatbázis hiba történt!' });
            }

            res.json({ success: true, message: 'Befizetés sikeresen mentve!' });
        });
    });
});



// Új végpont a FIZETENDO mező nullázásához
app.post('/resetFizetendo', (req, res) => {
    const { id, year, month } = req.body;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const resetQuery = `
        UPDATE ellatas
        SET FIZETENDO = 0
        WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}';
    `;

    DB.query(resetQuery, (err) => {
        if (err) {
            console.error('Hiba a FIZETENDO nullázásakor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        res.json({ success: true, message: 'FIZETENDO sikeresen nullázva!' });
    });
});

// Új végpont a FIZETENDO újraszámolásához
app.post('/recalculateFizetendo', (req, res) => {
    const { id, year, month } = req.body;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const recalculateQuery = `
        SELECT NAPOK, NAPIDIJ
        FROM ellatas
        WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}';
    `;

    DB.query(recalculateQuery, (err, results) => {
        if (err) {
            console.error('Hiba az újraszámoláskor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Nincs adat a kiválasztott ID-hoz!' });
        }

        const { NAPOK, NAPIDIJ } = results[0];
        let totalCost = 0;

        NAPOK.split('').forEach((dayStatus) => {
            if (dayStatus === '0') {
                return; // Nem számolunk díjat
            } else if (dayStatus === '2') {
                totalCost += NAPIDIJ * 0.2; // Példa: kórház 20%
            } else if (dayStatus === '3') {
                totalCost += NAPIDIJ * 0.6; // Példa: helyfoglalás 60%
            } else {
                totalCost += NAPIDIJ; // Alapértelmezett napidíj
            }
        });

        const updateQuery = `
            UPDATE ellatas
            SET FIZETENDO = '${totalCost}'
            WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}';
        `;

        DB.query(updateQuery, (updateErr) => {
            if (updateErr) {
                console.error('Hiba a FIZETENDO frissítésekor:', updateErr);
                return res.status(500).json({ error: 'Adatbázis hiba a FIZETENDO frissítésekor!' });
            }

            res.json({ success: true, message: 'FIZETENDO sikeresen újraszámolva!', totalCost });
        });
    });
});

// FIZETETT érték frissítése, beleértve negatív értékeket
app.post('/updateFizetett', (req, res) => {
    const { id, amount, year, month } = req.body;

    if (!id || amount === undefined || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const query = `
        UPDATE ellatas
        SET FIZETETT = ${amount}
        WHERE ID_PACIENS = ${id} AND EV = ${year} AND HO = ${month};
    `;

    DB.query(query, (err) => {
        if (err) {
            console.error('Hiba a befizetés frissítésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        res.json({ success: true, message: 'Befizetés sikeresen frissítve!' });
    });
});



app.post('/updateFizetendo', (req, res) => {
    const { id, newFizetendo } = req.body;

    if (!id || newFizetendo === undefined) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    // Közvetlen változók használata a lekérdezésben
    const query = `
        UPDATE ellatas
        SET FIZETENDO = ${newFizetendo}
        WHERE ID_PACIENS = ${id};
    `;

    DB.query(query, (err) => {
        if (err) {
            console.error('Hiba a fizetendő összeg frissítésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        res.json({ success: true, message: 'Fizetendő összeg sikeresen frissítve!' });
    });
});


app.post('/updateHatralek', (req, res) => {
    const { id, hatralek, year, month } = req.body;

    if (!id || hatralek === undefined || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const query = `
    UPDATE ellatas
    SET HATRALEK = ${hatralek}
    WHERE ID_PACIENS = ${id} AND EV = ${year} AND HO = ${month};
`;


    DB.query(query, (err) => {
        if (err) {
            console.error('Hiba a hátralék frissítésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        res.json({ success: true, message: 'Hátralék sikeresen frissítve!' });
    });

});



app.post('/updateTobblet', (req, res) => {
    const { id, tobblet, year, month } = req.body;
    console.log('Beérkező kérés:', id, tobblet, year, month); // Logold a beérkező kérést
    if (!id || tobblet === undefined || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const query = `
        UPDATE ellatas
        SET TOBBLET = ${tobblet}
        WHERE ID_PACIENS = ${id} AND EV = ${year} AND HO = ${month};
    `;

    DB.query(query, (err) => {
        if (err) {
            console.error('Hiba a többlet frissítésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        res.json({ success: true, message: 'Többlet sikeresen frissítve!' });
    });
});

app.get('/getHatralekTobblet', (req, res) => {
    console.log('Beérkező kérés:', req.query); // Logold a paramétereket
    // További kód itt...


    const { id, year, month } = req.query;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const query = `
        SELECT HATRALEK, TOBBLET
        FROM ellatas
        WHERE ID_PACIENS = ${id} AND EV = ${year} AND HO = ${month};
    `;

    DB.query(query, (err, results) => {
        if (err) {
            console.error('Hiba a hátralék és többlet lekérésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Nincsenek adatok a megadott hónapra.' });
        }

        const { HATRALEK, TOBBLET } = results[0];
        res.json({ hatralek: HATRALEK || 0, tobblet: TOBBLET || 0 });
    });
});




app.get('/getPatientsByStatus', (req, res) => {
    const { status } = req.query; // `status` could be 'Várakozó', 'Előgondozott', 'Ellátott', 'Távozott'
    
    if (!status) {
        return res.status(400).json({ error: 'Hiányzó státusz paraméter!' });
    }

    let dateField;
    if (status === 'Várakozó') {
        dateField = 'VARAKOZO_DATUM';
    } else if (status === 'Előgondozott') {
        dateField = 'ELOGOND_DATUM';
    } else if (status === 'Ellátott') {
        dateField = 'ELLATOTT_DATUM';
    } else if (status === 'Távozott') {
        dateField = 'TAVOZOTT_DATUM';
    } else {
        return res.status(400).json({ error: 'Érvénytelen státusz paraméter!' });
    }

    const sql = `
        SELECT NEV, TAJ, DATE_FORMAT(${dateField}, '%Y.%m.%d') AS DATUM, STATUS
        FROM paciensek
        WHERE STATUS = '${status}'
        ${status === 'Várakozó' ? 'ORDER BY SURGOS_VARAKOZO DESC, VARAKOZO_DATUM ASC' : ''}
    `;

    DB.query(sql, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }
        res.json({ rows: results });
    });
});


app.get('/checkIfPaid', (req, res) => {
    const { id, year, month } = req.query;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const sql = `
        SELECT FIZETETT 
        FROM ellatas 
        WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}'
        LIMIT 1;
    `;

    DB.query(sql, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba a befizetés ellenőrzésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        if (results.length === 0 || !results[0].FIZETETT) {
            return res.json({ paid: false });
        }

        res.json({ paid: true });
    });
});

app.post('/revertPayment', (req, res) => {
    const { id, year, month } = req.body;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    // Számoljuk ki a következő hónapot és évet
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;

    // Lekérdezzük az aktuális hónap többletét és hátralékát
    const selectQuery = `
        SELECT HATRALEK, TOBBLET
        FROM ellatas
        WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}'
        LIMIT 1;
    `;

    DB.query(selectQuery, (err, results) => {
        if (err) {
            console.error('Hiba a hátralék és többlet lekérdezésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Nem található adat az aktuális hónaphoz!' });
        }

        const hatralek = results[0].HATRALEK || 0;
        const tobblet = results[0].TOBBLET || 0;

        // Töröljük az aktuális hónap adatait (NULL helyett 0-t állítunk be)
        const updateCurrentMonthQuery = `
            UPDATE ellatas
            SET FIZETETT = 0, HATRALEK = 0, TOBBLET = 0
            WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}';
        `;

        DB.query(updateCurrentMonthQuery, (updateErr) => {
            if (updateErr) {
                console.error('Hiba az aktuális hónap adatok törlésekor:', updateErr);
                return res.status(500).json({ error: 'Adatbázis hiba történt!' });
            }

            // Mentjük a hátralékot és a többletet a következő hónaphoz
            const insertNextMonthQuery = `
                INSERT INTO ellatas (ID_PACIENS, EV, HO, HATRALEK, TOBBLET)
                VALUES ('${id}', '${nextYear}', '${nextMonth}', '${hatralek}', '${tobblet}')
                ON DUPLICATE KEY UPDATE 
                HATRALEK = '${hatralek}', 
                TOBBLET = '${tobblet}';
            `;

            DB.query(insertNextMonthQuery, (insertErr) => {
                if (insertErr) {
                    console.error('Hiba a következő hónap adatok mentésekor:', insertErr);
                    return res.status(500).json({ error: 'Adatbázis hiba történt!' });
                }

                res.json({ success: true, message: 'Befizetés, hátralék és többlet sikeresen visszavonva és a következő hónaphoz mentve!' });
            });
        });
    });
});


app.get('/getPaidAmount', (req, res) => {
    const { id, year, month } = req.query;

    if (!id || !year || !month) {
        return res.status(400).json({ error: 'Hiányzó paraméterek!' });
    }

    const sql = `
        SELECT FIZETETT 
        FROM ellatas 
        WHERE ID_PACIENS = '${id}' AND EV = '${year}' AND HO = '${month}'
        LIMIT 1;
    `;

    DB.query(sql, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba a befizetett összeg lekérdezésekor:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Nincs adat a megadott pácienshez!' });
        }

        const paid = results[0].FIZETETT || 0; // Ha nincs érték, alapértelmezettként 0-t adunk vissza
        res.json({ paid });
    });
});



// Havi forgalmi adatok lekérdezése
app.get('/getMonthlyFinancialData', (req, res) => {
    const { year, month } = req.query;

    if (!year || !month) {
        console.error('Hiányzó év vagy hónap!');
        return res.status(400).json({ error: 'Hiányzó év vagy hónap!' });
    }

    console.log(`Lekérdezés: év = ${year}, hónap = ${month}`);

    const query = `
        SELECT
            paciensek.NEV AS nev,
            ellatas.NAPIDIJ AS napidij,
            ellatas.FIZETETT AS fizetett,
            ellatas.FIZETENDO AS fizetendo,
            ellatas.HATRALEK AS hatralek,
            ellatas.TOBBLET AS tobblet
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE ellatas.EV = ? AND ellatas.HO = ?;
    `;

    DB.query(query, [year, month], (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        console.log('Lekérdezés eredménye:', results);

        const summary = {
            totalPatients: results.length,
            totalRevenue: results.reduce((sum, row) => sum + (row.fizetett || 0), 0),
            totalDebt: results.reduce((sum, row) => sum + (row.hatralek || 0), 0),
            totalOverpayment: results.reduce((sum, row) => sum + (row.tobblet || 0), 0)
        };

        console.log('Összegzés:', summary);

        res.json({ details: results, summary });
    });
});

// Éves forgalmi adatok lekérdezése
app.get('/getYearlyFinancialData', (req, res) => {
    const { year } = req.query;

    if (!year) {
        return res.status(400).json({ error: 'Hiányzó év!' });
    }

    const query = `
        SELECT
            paciensek.NEV AS nev,
            ellatas.HO AS honap,
            ellatas.NAPIDIJ AS napidij,
            ellatas.FIZETETT AS fizetett,
            ellatas.FIZETENDO AS fizetendo,
            ellatas.HATRALEK AS hatralek,
            ellatas.TOBBLET AS tobblet
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE ellatas.EV = ?;
    `;

    DB.query(query, [year], (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        const summary = results.reduce((acc, row) => {
            const month = row.honap;
            if (!acc[month]) {
                acc[month] = {
                    totalPatients: 0,
                    totalRevenue: 0,
                    totalDebt: 0,
                    totalOverpayment: 0
                };
            }

            acc[month].totalPatients++;
            acc[month].totalRevenue += row.fizetett || 0;
            acc[month].totalDebt += row.hatralek || 0;
            acc[month].totalOverpayment += row.tobblet || 0;

            return acc;
        }, {});

        res.json({ details: results, summary });
    });
});

app.get('/api/getEllatottPatients', (req, res) => {
    const { year, month } = req.query;

    // Ellenőrizzük, hogy az év és hónap paraméterek meg vannak-e adva
    if (!year || !month) {
        return res.status(400).json({ error: 'Év és hónap megadása kötelező!' });
    }

    // SQL lekérdezés, string interpolációval
    const query = `
        SELECT 
            paciensek.NEV, 
            paciensek.TAJ, 
            ellatas.NAPIDIJ, 
            ellatas.FIZETENDO, 
            ellatas.FIZETETT, 
            ellatas.HATRALEK, 
            ellatas.TOBBLET
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE paciensek.STATUS = 'ellátott'
          AND ellatas.EV = ${year}
          AND ellatas.HO = ${month};
    `;

    // Adatbázis-lekérdezés végrehajtása
    DB.query(query, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!', details: err });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Nincsenek adatok az adott időszakra.' });
        }

        res.json(results);
    });
});


app.get('/api/getKumulaltPatients', (req, res) => {
    const { year, month } = req.query;

    // Ellenőrizzük, hogy az év és hónap paraméterek meg vannak-e adva
    if (!year || !month) {
        return res.status(400).json({ error: 'Év és hónap megadása kötelező!' });
    }

    // SQL lekérdezés a kumulált adatokhoz
    const query = `
        SELECT 
            COUNT(paciensek.ID_PACIENS) AS LETSZAM,
            SUM(ellatas.FIZETENDO) AS OSSZES_FIZETENDO,
            SUM(ellatas.FIZETETT) AS OSSZES_FIZETETT,
            SUM(ellatas.HATRALEK) AS OSSZES_HATRALEK,
            SUM(ellatas.TOBBLET) AS OSSZES_TOBBLET
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE paciensek.STATUS = 'ellátott'
          AND ellatas.EV = ${year}
          AND ellatas.HO = ${month};
    `;

    // Adatbázis-lekérdezés végrehajtása
    DB.query(query, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba!', details: err });
        }

        res.json(results[0]); // Az eredményeket JSON-ként küldjük vissza
    });
});


app.get('/api/getEgyeniOsszesitettAdatok', (req, res) => {
    const year = req.query.year;

    if (!year) {
        return res.status(400).json({ error: 'Hiányzó év paraméter!' });
    }

    // Lekérdezés készítése változókkal
    const query = `
        SELECT 
            paciensek.NEV, 
            paciensek.TAJ, 
            SUM(ellatas.NAPIDIJ) AS osszes_napidij,
            SUM(ellatas.FIZETENDO) AS osszes_fizetendo, 
            SUM(ellatas.FIZETETT) AS osszes_fizetett, 
            SUM(ellatas.HATRALEK) AS osszes_hatralek, 
            SUM(ellatas.TOBBLET) AS osszes_tobblet
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE ellatas.EV = ${year}
        GROUP BY paciensek.NEV, paciensek.TAJ;
    `;

    // Adatbázis lekérdezés
    DB.query(query, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        // Az eredmények visszaadása rows formában
        res.json({ rows: results });
    });
});

app.get('/api/getEvesKumulaltAdatok', (req, res) => {
    const year = req.query.year;

    if (!year) {
        return res.status(400).json({ error: 'Hiányzó év paraméter!' });
    }

    const query = `
        SELECT
            COUNT(DISTINCT paciensek.ID_PACIENS) AS letszam,
            SUM(ellatas.FIZETENDO) AS osszes_tartozik,
            SUM(ellatas.FIZETETT) AS osszes_kovetel,
            SUM(ellatas.HATRALEK) AS osszes_hatralek,
            SUM(ellatas.TOBBLET) AS osszes_tobblet
        FROM paciensek
        INNER JOIN ellatas ON paciensek.ID_PACIENS = ellatas.ID_PACIENS
        WHERE ellatas.EV = ${year};
    `;

    DB.query(query, (err, results) => {
        if (err) {
            console.error('Adatbázis hiba:', err);
            return res.status(500).json({ error: 'Adatbázis hiba történt!' });
        }

        res.json(results[0]);
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