import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar as BigCalendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import CalendarMini from "react-calendar"; // mini calendar
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
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
  const [miniDate, setMiniDate] = useState(new Date());

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

  // Fetch events
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
          color: "#34A853" // green for Google events
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

  // Save event
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
      const res = await axios.post(`${BACKEND}/api/events`, payload, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const savedEvent = res.data;

      setEvents([...events, { ...savedEvent, start: new Date(savedEvent.start), end: new Date(savedEvent.end) }]);
      setSelectedSlot(null);
      setForm({ _id: "", title: "", description: "", location: "", type: "event", color: "#1a73e8", guests: "" });
    } catch (err) {
      console.error("Save event error:", err);
    }
  };
const [calendarDate, setCalendarDate] = useState(new Date());
const [filters, setFilters] = useState({
  personal: true,
  birthdays: true,
  tasks: true,
  holidays: true,
});

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
  const filteredEvents = events.filter(e => {
  if (e.type === "personal" && !filters.personal) return false;
  if (e.type === "birthday" && !filters.birthdays) return false;
  if (e.type === "task" && !filters.tasks) return false;
  if (e.type === "holiday" && !filters.holidays) return false;
  return true;
});


  // Custom Google Calendar style toolbar
  const CustomToolbar = ({ label, onNavigate, onView }) => {
    return (
      <div className="toolbar">
        <div className="toolbar-left">
          <button onClick={() => onNavigate("TODAY")} className="today-btn">Today</button>
          <button onClick={() => onNavigate("PREV")} className="nav-btn">◀</button>
          <button onClick={() => onNavigate("NEXT")} className="nav-btn">▶</button>
          <span className="month-label">{label}</span>
        </div>
        <div className="toolbar-right">
          <select onChange={(e) => onView(e.target.value)} className="view-switch" value={currentView}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-wrapper">
      <header className="header">
        <div className="header-left">
          <img src="https://www.gstatic.com/images/branding/product/1x/calendar_48dp.png" alt="Logo" className="logo" />
          <h1>Calendar</h1>
        </div>
        <div className="header-right">
          {user && <img src={user.picture} alt={user.name} className="profile-img" />}
        </div>
      </header>

     

      <div className="content">
        {/* LEFT SIDEBAR */}
        <aside className="sidebar">
          <button className="create-btn">+ Create</button>
          <CalendarMini
  value={miniDate}
  onChange={(date) => {
    setMiniDate(date);
    setCalendarDate(date);   // sync with big calendar
    setCurrentView(Views.WEEK);  // default to week view when selecting
  }}
/>

          
          <div className="cal-section">
            <h4>My calendars</h4>
            <label><input type="checkbox" defaultChecked /> Personal</label>
            <label><input type="checkbox" defaultChecked /> Birthdays</label>
            <label><input type="checkbox" defaultChecked /> Tasks</label>
          </div>

          <div className="cal-section">
  <h4>My calendars</h4>
  <label>
    <input
      type="checkbox"
      checked={filters.personal}
      onChange={() => setFilters({ ...filters, personal: !filters.personal })}
    /> Personal
  </label>
  <label>
    <input
      type="checkbox"
      checked={filters.birthdays}
      onChange={() => setFilters({ ...filters, birthdays: !filters.birthdays })}
    /> Birthdays
  </label>
  <label>
    <input
      type="checkbox"
      checked={filters.tasks}
      onChange={() => setFilters({ ...filters, tasks: !filters.tasks })}
    /> Tasks
  </label>
</div>

<div className="cal-section">
  <h4>Other calendars</h4>
  <label>
    <input
      type="checkbox"
      checked={filters.holidays}
      onChange={() => setFilters({ ...filters, holidays: !filters.holidays })}
    /> Holidays
  </label>
</div>

        </aside>

        {/* MAIN CALENDAR */}
        <main className="main">
     <BigCalendar
  localizer={localizer}
  events={filteredEvents}
  date={calendarDate}              // controlled date
  onNavigate={(newDate) => setCalendarDate(newDate)} // sync when navigating
  selectable
  startAccessor="start"
  endAccessor="end"
  view={currentView}
  onView={setCurrentView}
  onSelectSlot={handleSelectSlot}
  onSelectEvent={handleSelectEvent}
  eventPropGetter={(event) => ({
    style: {
      backgroundColor: event.color || "#1a73e8",
      color: "white",
      borderRadius: 6,
    },
  })}
/>

        </main>
      </div>

{selectedSlot && (
  <div
    className="event-popup"
    style={{
      "--popup-top": `${selectedSlot.box?.y || 100}px`,
      "--popup-left": `${selectedSlot.box?.x || 100}px`
    }}
  >
    {/* Header */}
    <div className="event-popup-header">
      {form._id ? "Edit Event" : "Add Event"}
    </div>

    {/* Body */}
    <div className="event-popup-body">
      {/* Title */}
      <input
        type="text"
        placeholder="Add title"
        value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })}
        required
      />

      {/* Date & Time */}
      <div className="datetime-row">
        <input
          type="date"
          value={moment(selectedSlot.start).format("YYYY-MM-DD")}
          onChange={e =>
            setSelectedSlot({
              ...selectedSlot,
              start: new Date(e.target.value + "T" + moment(selectedSlot.start).format("HH:mm")),
              end: new Date(e.target.value + "T" + moment(selectedSlot.end).format("HH:mm")),
            })
          }
        />
        <input
          type="time"
          value={moment(selectedSlot.start).format("HH:mm")}
          onChange={e =>
            setSelectedSlot({
              ...selectedSlot,
              start: new Date(moment(selectedSlot.start).format("YYYY-MM-DD") + "T" + e.target.value),
              end: selectedSlot.end,
            })
          }
        />
        <span>–</span>
        <input
          type="time"
          value={moment(selectedSlot.end).format("HH:mm")}
          onChange={e =>
            setSelectedSlot({
              ...selectedSlot,
              end: new Date(moment(selectedSlot.end).format("YYYY-MM-DD") + "T" + e.target.value),
              start: selectedSlot.start,
            })
          }
        />
      </div>

      {/* Guests */}
      <input
        type="text"
        placeholder="Add guests"
        value={form.guests}
        onChange={e => setForm({ ...form, guests: e.target.value })}
      />

      {/* Location */}
      <input
        type="text"
        placeholder="Add location"
        value={form.location}
        onChange={e => setForm({ ...form, location: e.target.value })}
      />

      {/* Description */}
      <textarea
        placeholder="Add description"
        rows={2}
        value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })}
      />
    </div>

    {/* Footer */}
    <div className="event-popup-footer">
      <button className="more-options">More options</button>
      <div className="actions">
        <button className="cancel" onClick={() => setSelectedSlot(null)}>
          Cancel
        </button>
        <button className="save" onClick={handleSaveEvent}>
          Save
        </button>
      </div>
    </div>
  </div>
)}

       <button
        className="google-btn"
        onClick={() => window.location.href = `${BACKEND}/api/auth/google`}
      >
        Connect Google Calendar
      </button>
    </div>
  );
};

export default Calendar;
