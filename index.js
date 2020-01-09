const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const express = require('express');
const cors = require('cors');

if (process.env.NODE_ENV !== 'production') { require('dotenv').config() }

const app = express();
const eventInfo = [];

//Middleware
app.use(express.json());
app.use(cors());

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
 fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) res.status(403).send('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) res.status(403).send(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  calendar.events.list({
    calendarId: '2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com',
    timeMin: (new Date()).toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) res.status(404).send('The API returned an error: ' + err);
    const events = res.data.items;
      events.forEach(event => {
        eventInfo.push({ description: event.summary, start: event.start, end: event.end });
      });
    return events;
  });
}

function addEvent(auth) {
  const calendar = google.calendar({ version: 'v3', auth });
  console.log(dummy);
  calendar.events.insert({
    calendarId: '2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com',
    resource: {
      summary: '50 min cons',
      creator: {
        email: 'test@gmail.com',
        displayName: 'bob'
      },
      organizer: {
        email: '2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com',
        displayName: 'booking test',
        self: true
      },
      end:
      {
        dateTime: '2020-01-11T17:20:00+08:00',
        timeZone: 'Australia/Perth'
      },
      start:
      {
        dateTime: '2020-01-10T16:30:00+08:00',
        timeZone: 'Australia/Perth'
      }
    }
  }, (err, res) => {
    if (err) return console.log('The add event API returned an error: ' + err);
  });
}

app.get('/', (req, res) => res.send('Server up and running.'));
app.get('/timeslots', (req, res) => {
  fs.readFile(('credentials.json'), (err, content) => {
    if (err) res.status(404).send('Error loading client secret file:', err);
     // Authorize a client with credentials, then call the Google Calendar API.
    //  res.send({ crocodiles: ['judy', 'nigel', 'spence'] });
    const events = authorize(JSON.parse(content), listEvents);
    res.send(events);
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT}.`);
});