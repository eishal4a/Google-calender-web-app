import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar as BigCalendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calender.css";

const localizer = momentLocalizer(moment);
const BACKEND = "https://26e2b6f8-4ec3-4832-ae51-db31c1a5b1bc-00-141z0r56gosoi.sisko.replit.dev";

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [currentView, setCurrentView] = useState(Views.WEEK);

  // Load Google OAuth token and user info
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const userInfo = params.get("user");

    if (token && userInfo) {
      const userObj = JSON.parse(decodeURIComponent(userInfo));
      setAccessToken(token);
      setUser(userObj);

      localStorage.setItem("accessToken", token);
      localStorage.setItem("user", JSON.stringify(userObj));

      window.history.replaceState({}, document.title, "/");
    } else {
      const storedToken = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        setAccessToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    }
  }, []);

  // Fetch events from backend and Google Calendar
  useEffect(() => {
    fetchEvents();
  }, [accessToken]);

  const fetchEvents = async () => {
    let allEvents = [];
    try {
      // Backend events
      const res = await axios.get(`${BACKEND}/api/events`);
      const backendEvents = res.data.map(e => ({
        ...e,
        start: new Date(e.start),
        end: new Date(e.end),
        color: e.color || "#1a73e8"
      }));
      allEvents = [...backendEvents];

      // Google Calendar events
      if (accessToken) {
        const gcalRes = await axios.get("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const gcalEvents = gcalRes.data.items.map(e => ({
          _id: e.id,
          title: e.summary,
          description: e.description,
          location: e.location,
          start: new Date(e.start.dateTime || e.start.date),
          end: new Date(e.end.dateTime || e.end.date),
          color: "#34A853" // Google Calendar events in green
        }));
        allEvents = [...allEvents, ...gcalEvents];
      }

      setEvents(allEvents);
    } catch (err) {
      console.error("Fetch events error:", err);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
  };

  const handleSelectEvent = (event) => {
    setSelectedSlot({ start: event.start, end: event.end });
    setForm({ ...event });
  };

  // Save event to backend and Google Calendar
  const handleSaveEvent = async (ev) => {
    ev.preventDefault();
    if (!selectedSlot) return;

    const payload = {
      title: form.title,
      description: form.description,
      location: form.location,
      type: form.type,
      color: form.color,
      guests: form.guests,
      start: selectedSlot.start.toISOString(),
      end: selectedSlot.end.toISOString(),
    };

    try {
      // Save to backend
      const res = await axios.post(`${BACKEND}/api/events`, payload);
      
      const savedEvent = res.data;

      // Save to Google Calendar
      if (accessToken) {
        await axios.post(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            summary: payload.title,
            description: payload.description,
            location: payload.location,
            start: { dateTime: payload.start },
            end: { dateTime: payload.end },
            attendees: payload.guests?.split(",").map(email => ({ email: email.trim() })),
          },
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }

      setEvents([...events, { ...savedEvent, start: new Date(savedEvent.start), end: new Date(savedEvent.end) }]);
      setSelectedSlot(null);
      setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
    } catch (err) {
      console.error("Save event error:", err);
     
    }
  };

  const handleDeleteEvent = async () => {
    if (!form._id) return;
    try {
      await axios.delete(`${BACKEND}/api/events/${form._id}`);
      setEvents(events.filter(evnt => evnt._id !== form._id));
      setSelectedSlot(null);
      setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
    } catch (err) {
      console.error("Delete event error:", err);
    }
  };

  return (
    <div className="calendar-wrapper">
      <header className="header">
        <h1>My Calendar</h1>
        {user && <img src={user.picture} alt={user.name} style={{ width: 32, borderRadius: "50%" }} />}
      </header>

      <button
        onClick={() => window.location.href = `${BACKEND}/api/auth/google`}
        style={{ marginBottom: 20 }}
      >
        Connect Google Calendar
      </button>

      <BigCalendar
        localizer={localizer}
        events={events}
        selectable
        startAccessor="start"
        endAccessor="end"
        view={currentView}
        onView={setCurrentView}
        style={{ height: 500 }}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={(event) => ({ style: { backgroundColor: event.color || "#1a73e8", color: "white", borderRadius: 6 } })}
      />

      {selectedSlot && (
        <div className="event-popup">
          <h3>{form._id ? "Edit Event" : "Add Event"}</h3>
          <form onSubmit={handleSaveEvent}>
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input type="text" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input type="text" placeholder="Guests (comma separated)" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} />
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            <div style={{ marginTop: 10 }}>
              <button type="submit">Save</button>
              {form._id && <button type="button" onClick={handleDeleteEvent} style={{ marginLeft: 10 }}>Delete</button>}
              <button type="button" onClick={() => setSelectedSlot(null)} style={{ marginLeft: 10 }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Calendar;
