const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

require("dotenv").config();
const fileUpload = require("express-fileupload");
// const db = require('./models/db');
const initializeDb = require('./models/db');
// const knex = require("knex")(db);
const helmet = require('helmet');
const cors = require('cors');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const videoRouter = require('./routes/video');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(fileUpload());
app.use(helmet());
app.use(cors());

let knex;

async function setupDatabase() {
    try {
        const dbConfig = await initializeDb(); // Get the database configuration asynchronously
        knex = require("knex")(dbConfig); // Initialize Knex with the configuration

        // Perform a test query to ensure the connection is successful
        await knex.raw('SELECT 1+1 AS result')
            .then(() => {
                console.log("Database connection established successfully.");
            })
            .catch((err) => {
                console.error("Failed to establish database connection:", err);
                process.exit(1); // Exit the process if the test query fails
            });
    } catch (error) {
        console.error("Failed to initialize the database:", error);
        process.exit(1); // Exit the process if the database setup fails
    }
}
setupDatabase();

// Make the database connection available to the application
app.use((req, res, next) => {
    req.db = knex;
    next();
});

app.use('/', indexRouter);
// app.use('/users', usersRouter);
app.use('/video', videoRouter);

// Test database connection and version
app.use("/version", (req, res) => {
  // Determine the database version
  req.db.raw("SELECT VERSION()")
      .then(versionResponse => {
        const version = versionResponse[0][0];

        // Fetch the table names
        req.db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'videoConverter'")
            .then(tablesResponse => {
              res.send({
                version: version,
                tables: tablesResponse[0]
              });
            }).catch(err => {
          console.error('Error fetching table names:', err);
          res.status(500).send('Failed to retrieve table names');
        });
      })
      .catch(err => {
        console.error('Error fetching database version:', err);
        res.status(500).send('Failed to retrieve database version');
      });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
