import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar as BigCalendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./calendar.css";

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
      setAccessToken(token);
      setUser(JSON.parse(decodeURIComponent(userInfo)));
    }
  }, []);

  // Fetch events from backend
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/events`);
      setEvents(res.data.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) })));
    } catch (err) {
      console.error("Fetch events error:", err);
    }
  };

  // Select a slot for new event
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
  };

  // Select an existing event
  const handleSelectEvent = (event) => {
    setSelectedSlot({ start: event.start, end: event.end });
    setForm({ ...event });
  };

  // Save or update event
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
      start: selectedSlot.start,
      end: selectedSlot.end,
    };

    try {
      let res;
      if (form._id) {
        res = await axios.put(`${BACKEND}/api/events/${form._id}`, payload);
        const updated = res.data;
        setEvents(events.map(evnt => evnt._id === form._id ? { ...updated, start: new Date(updated.start), end: new Date(updated.end) } : evnt));
      } else {
        res = await axios.post(`${BACKEND}/api/events`, payload);
        const created = res.data;
        setEvents([...events, { ...created, start: new Date(created.start), end: new Date(created.end) }]);
      }

      setSelectedSlot(null);
      setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
    } catch (err) {
      console.error("Save event error:", err);
      alert("Failed to save event. Check console.");
    }
  };

  // Delete event
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
          <form >
            <input type="text" placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            <input type="text" placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <input type="text" placeholder="Guests (comma separated)" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} />
            <input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            <div style={{ marginTop: 10 }}>
              <button type="submit" onSubmit={handleSaveEvent}>>Save</button>
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
