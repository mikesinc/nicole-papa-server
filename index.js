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
  const { eventId, title, resource } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: "2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com",
        eventId: eventId,
        resource: {
          summary: title
        }
      },
      (err) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        }
      }
    );
    calendar.events.insert(
      {
        calendarId: "mas.sinclair@gmail.com",
        resource: resource
      },
      (err, result) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ message: "Event added to main calendar.", result }));
        }
      }
    );
  });
});

app.get("/cancel", (req, res) => {
  const { eventId } = req.body
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: "2b0ajo6jvug90l1tspvunpiu8g@group.calendar.google.com",
        eventId: eventId,
        resource: {
          summary: "Open"
        }
      },
      (err) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        }
      }
    );
    calendar.events.delete(
      {
        calendarId: "mas.sinclair@gmail.com",
        eventId: eventId,
      },
      (err) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ message: "Event deleted.", result }));
        }
      }
    );
  });
});

app.listen(process.env.PORT || 3001, () => {
  console.log(`Server running on port ${process.env.PORT}.`);
});
