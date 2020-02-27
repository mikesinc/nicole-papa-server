const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const express = require("express");
const cors = require("cors");

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const app = express();

//Middleware
app.use(express.json());
app.use(cors());

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

function listEvents(auth) {}

// function addEvent(auth) {
//   const calendar = google.calendar({ version: 'v3', auth });
//   console.log(dummy);
//   calendar.events.insert({
//     calendarId: '2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com',
//     resource: {
//       summary: '50 min cons',
//       creator: {
//         email: 'test@gmail.com',
//         displayName: 'bob'
//       },
//       organizer: {
//         email: '2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com',
//         displayName: 'booking test',
//         self: true
//       },
//       end:
//       {
//         dateTime: '2020-01-11T17:20:00+08:00',
//         timeZone: 'Australia/Perth'
//       },
//       start:
//       {
//         dateTime: '2020-01-10T16:30:00+08:00',
//         timeZone: 'Australia/Perth'
//       }
//     }
//   }, (err, res) => {
//     if (err) return console.log('The add event API returned an error: ' + err);
//   });
// }

// const calendarFunction = func => {
//   fs.readFile("credentials.json", (err, content) => {
//     if (err) return console.log("Error loading client secret file:", err);
//     authorize(JSON.parse(content), func);
//   });
// };

app.get("/", (req, res) => {
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    const events = [];
    calendar.events.list(
      {
        calendarId: "2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com",
        timeMin: new Date().toISOString(),
        maxResults: 50,
        singleEvents: true,
        orderBy: "startTime"
      },
      (err, result) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          if (result.data.items.length) {
            result.data.items.forEach(event => {
              events.push({
                title: event.summary,
                start: new Date(event.start.dateTime),
                end: new Date(event.end.dateTime),
                availability: event.status,
                eventId: event.id
              });
            });
            res.send(JSON.stringify({ events: events }));
          } else {
            res.send(JSON.stringify({ message: "No upcoming events found." }));
          }
        }
      }
    );
  });
});

app.post("/patch", (req, res) => {
  const { calendarId, eventId, title } = req.body;
  console.log(calendarId);
  console.log(eventId);
  console.log(title);
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: calendarId,
        eventId: eventId,
        resource: {
          summary: title
        }
      },
      (err, result) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ message: "Event updated.", result }));
        }
      }
    );
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT}.`);
});
