const fs = require("fs");
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

const setDay = date => {
  date = new Date(date.getTime());
  date.setDate(date.getDate() + ((4 + 7 - date.getDay()) % 7));
  return date;
};

app.post("/", (req, res) => {
  let { week } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    let events = [];
    if (week === 0) {
      week = new Date();
    }
    week = new Date(week);

    calendar.events.list(
      {
        calendarId: process.env.BOOKING_CALENDAR_ID,
        timeMin: week.toISOString(),
        maxResults: 12,
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
            res.send(JSON.stringify({ message: "No upcoming events." }));
          }
        }
      }
    );
  });
});

app.post("/checkbusybatch", (req, res) => {
  const { events, id } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    let busyArray = [];

    for (let i = 0; i < events.length; i++) {
      const check = {
        auth: jwt,
        resource: {
          timeMin: events[i].start,
          timeMax: events[i].end,
          items: [{ id: [id] }]
        }
      };
      calendar.freebusy.query(check, (err, response) => {
        if (err) {
          res.send(JSON.stringify({ message: "busy check failed" }));
        } else {
          busyArray[i] = {
            eventId: events[i].eventId,
            busyStatus:
              response.data.calendars[Object.keys(response.data.calendars)[0]]
                .busy.length
          };
          if (Object.keys(busyArray).length === events.length) {
            res.send(JSON.stringify({ busyArray: busyArray }));
          }
        }
      });
    }
  });
});

app.post("/checkbusy", (req, res) => {
  const { start, end, id } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });

    const check = {
      auth: jwt,
      resource: {
        timeMin: start.dateTime,
        timeMax: end.dateTime,
        items: [{ id: [id] }]
      }
    };
    calendar.freebusy.query(check, (err, response) => {
      if (err) {
        res.send(JSON.stringify({ error: err }));
      } else {
        const isBusy =
          response.data.calendars[Object.keys(response.data.calendars)[0]].busy
            .length;
        res.send(JSON.stringify({ busyStatus: isBusy }));
      }
    });
  });
});

app.post("/book", (req, res) => {
  const { eventId, title, resource, calId } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: process.env.BOOKING_CALENDAR_ID,
        eventId: eventId,
        resource: {
          summary: title
        }
      },
      err => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        }
      }
    );
    calendar.events.insert(
      {
        calendarId: calId,
        resource: resource
      },
      (err, result) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(
            JSON.stringify({ message: "Event added to main calendar.", result })
          );
        }
      }
    );
  });
});

app.post("/patch", (req, res) => {
  const { eventId, title } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: process.env.BOOKING_CALENDAR_ID,
        eventId: eventId,
        resource: {
          summary: title
        }
      },
      (err, result) => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        } else {
          res.send(JSON.stringify({ message: "Event patched.", result }));
        }
      }
    );
  });
});

app.post("/cancel", (req, res) => {
  const { eventId, mainCalEventId, calId } = req.body;
  fs.readFile("credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    const { client_email, private_key } = JSON.parse(content);
    const jwt = new google.auth.JWT(client_email, null, private_key, SCOPES);
    const calendar = google.calendar({ version: "v3", auth: jwt });
    calendar.events.patch(
      {
        calendarId: process.env.BOOKING_CALENDAR_ID,
        eventId: eventId,
        resource: {
          summary: "Available"
        }
      },
      err => {
        if (err) {
          res.send(JSON.stringify({ error: err }));
        }
      }
    );
    calendar.events.delete(
      {
        calendarId: calId,
        eventId: mainCalEventId
      },
      (err, result) => {
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
