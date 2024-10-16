// server.js
const express = require('express');
const app = express();
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const port = 8000;

app.use(cors());

// Define the database directory and file path
const dbDir = '/opt/var/uga-dining-hall';
const dbFileName = 'diningHallData.db';
const dbPath = path.join(dbDir, dbFileName);

// Ensure the database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Created directory ${dbDir}`);
}

// Check if the database file exists at the specified path
if (!fs.existsSync(dbPath)) {
  // If it doesn't exist, check if there's a local database file to copy
  const localDbPath = path.resolve(__dirname, dbFileName);
  if (fs.existsSync(localDbPath)) {
    fs.copyFileSync(localDbPath, dbPath);
    console.log(`Copied database file to ${dbPath}`);
  } else {
    // If no local database exists, a new one will be created
    console.log(`No existing database file found. A new database will be created at ${dbPath}`);
  }
} else {
  console.log(`Database file already exists at ${dbPath}`);
}

// Initialize SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to the database:', err);
  } else {
    console.log(`Connected to SQLite database at ${dbPath}`);
  }
});

// Create a table to store dining hall capacities
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS dining_hall_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hall_name TEXT,
      availability INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Function to fetch capacity data from the external API and save to the database
async function getData() {
  try {
    let response = await fetch("http://apps.auxiliary.uga.edu/Dining/OccupancyCounter/api/occupancy.php");

    if (!response.ok) {
      console.log(`Error: ${response.status}`);
      return;
    }

    let json = await response.json();
    const timestamp = new Date().toISOString();
    json = json.diningHalls;

    // Prepare the insert statement
    const stmt = db.prepare(`
      INSERT INTO dining_hall_data (hall_name, availability, timestamp)
      VALUES (?, ?, ?)
    `);

    // Insert data for each dining hall
    for (const key in json) {
      const hallData = json[key];
      const hallName = hallData.display_name;
      const availability = hallData.availability;

      stmt.run(hallName, availability, timestamp, function (err) {
        if (err) {
          console.error('Error inserting data:', err);
        } else {
          console.log(`Inserted data for ${hallName} at ${timestamp}`);
        }
      });
    }

    stmt.finalize();
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

setInterval(() => {
  getData();
}, 5 * 60 * 1000); // Fetch data every 5 minutes

// Fetch data once when the server starts
getData();

// API endpoint to get data for a specific dining hall and optional time range
app.get('/api/capacity/:hall', (req, res) => {
  const hall = req.params.hall;
  const startTime = req.query.startTime; // ISO datetime string
  const endTime = req.query.endTime; // ISO datetime string

  let query = `
    SELECT hall_name, availability, timestamp
    FROM dining_hall_data
    WHERE hall_name = ?
  `;
  let params = [hall];

  if (startTime && endTime) {
    query += ` AND timestamp BETWEEN ? AND ?`;
    params.push(startTime, endTime);
  } else if (startTime) {
    query += ` AND timestamp >= ?`;
    params.push(startTime);
  } else if (endTime) {
    query += ` AND timestamp <= ?`;
    params.push(endTime);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).send('Internal server error');
    } else if (rows.length === 0) {
      res.status(404).send('No data found for the specified dining hall and time range');
    } else {
      res.json(rows);
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
