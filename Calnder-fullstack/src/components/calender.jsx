import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar as BigCalendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import SmallCalendar from "react-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
import "./calender.css";
import YearView from '../components/yearview'; 
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import AppsIcon from "@mui/icons-material/Apps";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const localizer = momentLocalizer(moment);
const BACKEND = "https://26e2b6f8-4ec3-4832-ae51-db31c1a5b1bc-00-141z0r56gosoi.sisko.replit.dev";

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [date, setDate] = useState(new Date());
  const [visibleCalendars, setVisibleCalendars] = useState({});
  const [currentView, setCurrentView] = useState(Views.WEEK);
  const [showDropdown, setShowDropdown] = useState(false);

  const [form, setForm] = useState({
    _id: undefined,
    title: "",
    description: "",
    guests: "",
    location: "",
    type: "event",
    color: "#1a73e8",
  });

  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const filteredEvents = events.filter(e => visibleCalendars[e.title] ?? true);

  // Fetch backend events
  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${BACKEND}/api/events`);
      setEvents(
        res.data.map(e => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }))
      );
    } catch (err) {
      console.error("fetchEvents error:", err);
    }
  };

  // Fetch Google Calendar events
  const fetchGoogleEvents = async (token) => {
    if (!token) return;
    try {
      const res = await axios.get(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const googleEvents = res.data.items.map(e => ({
        _id: e.id,
        title: e.summary,
        description: e.description,
        start: new Date(e.start.dateTime || e.start.date),
        end: new Date(e.end.dateTime || e.end.date),
        color: "#34a853",
        type: "event",
        location: e.location || "",
        guests: e.attendees ? e.attendees.map(a => a.email).join(", ") : "",
      }));

      setEvents(prev => [...prev, ...googleEvents]);
    } catch (err) {
      console.error("Error fetching Google Calendar events:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Handle Google OAuth token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    const userInfo = params.get("user");

    if (token && userInfo) {
      setAccessToken(token);
      setUser(JSON.parse(decodeURIComponent(userInfo)));
      fetchGoogleEvents(token);
    }
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      const init = {};
      events.forEach(e => { init[e.title] = true; });
      setVisibleCalendars(init);
    }
  }, [events]);

  const handleSelectSlot = (slot) => {
    setSelectedSlot({ start: slot.start, end: slot.end, isEditing: false });
    setForm({ _id: undefined, title: "", description: "", guests: "", location: "", type: "event", color: "#1a73e8" });
  };

  const handleSelectEvent = (event) => {
    setSelectedSlot({ start: event.start, end: event.end, isEditing: true });
    setForm({
      _id: event._id, 
      title: event.title || "",
      description: event.description || "",
      guests: event.guests || "",
      location: event.location || "",
      type: event.type || "event",
      color: event.color || "#1a73e8",
    });
  };

  const handleSaveEvent = async (ev) => {
  ev.preventDefault();
  if (!selectedSlot) return;

  const payload = {
    title: form.title,
    description: form.description,
    guests: form.guests,
    location: form.location,
    type: form.type,
    color: form.color,
    start: selectedSlot.start,
    end: selectedSlot.end,
  };

  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

  try {
    let res;
    if (form._id) {
      // Update existing event
      res = await axios.put(`${BACKEND}/api/events/${form._id}`, payload, { headers });
      const updated = res.data;
      setEvents(events.map(evnt =>
        evnt._id === form._id
          ? { ...updated, start: new Date(updated.start), end: new Date(updated.end) }
          : evnt
      ));
    } else {
      // Create new event
      res = await axios.post(`${BACKEND}/api/events`, payload, { headers });
      const created = res.data;
      setEvents([...events, { ...created, start: new Date(created.start), end: new Date(created.end) }]);
    }

    // Reset form
    setSelectedSlot(null);
    setForm({
      _id: undefined,
      title: "",
      description: "",
      guests: "",
      location: "",
      type: "event",
      color: "#1a73e8",
    });

  } catch (err) {
    console.error("Error saving event:", err);
    alert("Failed to save event. Check console for details.");
  }
};

  const handleDeleteEvent = async () => {
    if (!form._id) return;
    try {
      await axios.delete(`${BACKEND}/api/events/${form._id}`);
      setEvents(events.filter(evnt => evnt._id !== form._id));
      if (accessToken) {
        await axios.delete(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${form._id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      setEvents(events.filter(evnt => evnt._id !== form._id));
    }
    setSelectedSlot(null);
    setForm({ _id: undefined, title: "", description: "", guests: "", location: "", type: "event", color: "#1a73e8" });
  };

  const tileContent = ({ date: tileDate, view }) => {
    if (view === "month") {
      const dayEvents = filteredEvents.filter(
        e => moment(tileDate).isSame(e.start, "day") || moment(tileDate).isBetween(e.start, e.end, "day", "[]")
      );
      if (dayEvents.length > 0) return <div className="event-dot" />;
    }
    return null;
  };

  return (
    <div className="calendar-wrapper">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <MenuIcon style={{ fontSize: 28, cursor: "pointer" }} />
          <img src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_28_2x.png" alt="logo" className="header-logo" />
          <h1>Calendar</h1>
        </div>
        <div className="header-center">
          <div className="search-wrapper">
            <SearchIcon style={{ color: "#5f6368" }} />
            <input type="text" placeholder="Search" className="search-bar" />
          </div>
        </div>
        <div className="header-right">
          <AppsIcon style={{ fontSize: 26, cursor: "pointer" }} />
          {user ? (
            <img src={user.picture} alt={user.name} className="profile-img" />
          ) : (
            <AccountCircleIcon style={{ fontSize: 32, color: "#5f6368" }} />
          )}
        </div>
      </header>

      <div className="body-wrapper">
        <aside className="sidebar">
          <div className="create-dropdown">
            <button className="create-btn" onClick={() => setShowDropdown(prev => !prev)}>+ Create</button>
            {showDropdown && (
              <div className="create-menu">
                <div className="menu-item" onClick={() => alert("New Event")}>Event</div>
                <div className="menu-item" onClick={() => alert("New Task")}>Task</div>
                <div className="menu-item" onClick={() => alert("New Appointment")}>Appointment schedule</div>
              </div>
            )}
          </div>
          <div className="mini-calendar">
            <SmallCalendar onChange={setDate} value={date} tileContent={tileContent} />
          </div>
          <h4>My calendars</h4>
          <div className="calendar-list">
            {events.length > 0 ? events.map((event, idx) => (
              <label key={idx}>
                <input type="checkbox" checked={visibleCalendars[event.title] ?? true} onChange={() => setVisibleCalendars({ ...visibleCalendars, [event.title]: !visibleCalendars[event.title] })} />
                {event.title}
              </label>
            )) : (
              <>
                <label><input type="checkbox" defaultChecked /> International Holidays</label>
                <label><input type="checkbox" defaultChecked /> New Year’s Day</label>
                <label><input type="checkbox" defaultChecked /> Eid ul-Fitr</label>
                <label><input type="checkbox" defaultChecked /> Christmas</label>
              </>
            )}
          </div>
        </aside>

        <main className="main">
          <div className="toolbar">
            <div className="toolbar-left">
              <button className="today" onClick={() => setDate(new Date())}>Today</button>
              <button onClick={() => setDate(moment(date).subtract(1, "month").toDate())} className="cclrs"><ChevronLeftIcon fontSize="small" /></button>
              <button onClick={() => setDate(moment(date).add(1, "month").toDate())} className="cclrs"><ChevronRightIcon fontSize="small" /></button>
              <span className="month-label">{moment(date).format("MMMM YYYY")}</span>
            </div>
            <div className="toolbar-right">
              <button onClick={() => setCurrentView(Views.DAY)} className="cclrs">Day</button>
              <button onClick={() => setCurrentView(Views.WEEK)} className="cclrs">Week</button>
              <button onClick={() => setCurrentView(Views.MONTH)} className="cclrs">Month</button>
              <button onClick={() => setCurrentView("year")} className="cclrs">Year</button>
            </div>
          </div>

          {currentView === "year" ? (
            <YearView date={date} onChange={setDate} />
          ) : (
            <BigCalendar
              localizer={localizer}
              events={events}
              selectable
              startAccessor="start"
              endAccessor="end"
              view={currentView}
              onView={setCurrentView}
              date={date}
              onNavigate={setDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              style={{ flex: 1, height: "100%" }}
              eventPropGetter={(event) => ({
                style: { backgroundColor: event.color || "#1a73e8", borderRadius: "6px", color: "white", border: "none", padding: "4px 6px", fontSize: "13px" },
              })}
              components={{
                event: ({ event }) => (
                  <div className="custom-event">
                    <div className="event-title">{event.title}</div>
                    <div className="event-time">{moment(event.start).format("h:mm A")} – {moment(event.end).format("h:mm A")}</div>
                  </div>
                ),
              }}
            />
          )}
        </main>
      </div>

      <button className="google-btn" onClick={() => window.location.href = `${BACKEND}/api/auth/google`}>
        Connect Google Calendar
      </button>

      {selectedSlot && (
        <div className="event-popup">
          <h3>{selectedSlot?.isEditing ? "Edit Event" : "Add Event"}</h3>
          <form onSubmit={handleSaveEvent}>
            <input type="text" placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <div className="datetime-row">
              <label>Start:</label>
              <input type="datetime-local" value={moment(selectedSlot.start).format("YYYY-MM-DDTHH:mm")} onChange={(e) => setSelectedSlot({ ...selectedSlot, start: new Date(e.target.value) })} />
            </div>
            <div className="datetime-row">
              <label>End:</label>
              <input type="datetime-local" value={moment(selectedSlot.end).format("YYYY-MM-DDTHH:mm")} onChange={(e) => setSelectedSlot({ ...selectedSlot, end: new Date(e.target.value) })} />
            </div>
            <input type="text" placeholder="Add guests (comma separated emails)" value={form.guests || ""} onChange={(e) => setForm({ ...form, guests: e.target.value })} />
            <input type="text" placeholder="Location" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <textarea placeholder="Description" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <select value={form.type || "event"} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="event">Event</option>
              <option value="task">Task</option>
              <option value="appointment">Appointment</option>
            </select>
            <div className="color-picker">
              <label>Event Color:</label>
              <input type="color" value={form.color || "#1a73e8"} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="save" type="submit" onSubmit={handleSaveEvent}>Save</button>
              <button className="cancel" type="button" onClick={() => setSelectedSlot(null)}>Cancel</button>
              {selectedSlot?.isEditing && (
                <button type="button" onClick={handleDeleteEvent} style={{ background: "red", color: "white", padding: "8px 12px", borderRadius: 6 }}>Delete</button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Calendar;
