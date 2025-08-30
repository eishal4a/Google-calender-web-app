import React, { useEffect, useState } from "react";
import axios from "axios";
import { Calendar as BigCalendar, momentLocalizer, Views } from "react-big-calendar";
import moment from "moment";
import SmallCalendar from "react-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-calendar/dist/Calendar.css";
import "./calender.css";

import YearView from '../components/yearview'; 

// Icons
import MenuIcon from "@mui/icons-material/Menu";
import SearchIcon from "@mui/icons-material/Search";
import AppsIcon from "@mui/icons-material/Apps";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import AddIcon from "@mui/icons-material/Add";

const localizer = momentLocalizer(moment);

const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ title: "", description: "" });
  const [date, setDate] = useState(new Date());
  const [visibleCalendars, setVisibleCalendars] = useState({});
  const [currentView, setCurrentView] = useState(Views.WEEK);
const [showDropdown, setShowDropdown] = useState(false);
const filteredEvents = events.filter(e => visibleCalendars[e.title]);

useEffect(() => {
  if (events.length > 0) {
    const init = {};
    events.forEach(e => { init[e.title] = true; });
    setVisibleCalendars(init);
  }
}, [events]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("http://localhost:4000/api/events");
      setEvents(
        res.data.map((e) => ({
          ...e,
          start: new Date(e.start),
          end: new Date(e.end),
        }))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
    setForm({ title: "", description: "" });
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      const newEvent = {
        title: form.title,
        description: form.description,
        start: selectedSlot.start,
        end: selectedSlot.end,
      };
      const res = await axios.post("http://localhost:4000/api/events", newEvent);
      setEvents([
        ...events,
        { ...res.data, start: new Date(res.data.start), end: new Date(res.data.end) },
      ]);
      setSelectedSlot(null);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="calendar-wrapper">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <MenuIcon style={{ fontSize: 28, cursor: "pointer" }} />
          <img
            src="https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_28_2x.png"
            alt="logo"
            className="header-logo"
          />
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
          <AccountCircleIcon style={{ fontSize: 32, color: "#5f6368" }} />
        </div>
      </header>

      <div className="body-wrapper">
        {/* Sidebar */}
        <aside className="sidebar">
          {/* Sidebar Create Button with Dropdown */}
<div className="create-dropdown">
  <button
    className="create-btn"
    onClick={() => setShowDropdown((prev) => !prev)}
  >
    + Create
  </button>

  {showDropdown && (
    <div className="create-menu">
      <div className="menu-item" onClick={() => alert("New Event")}>
        📅 Event
      </div>
      <div className="menu-item" onClick={() => alert("New Task")}>
        ✅ Task
      </div>
      <div className="menu-item" onClick={() => alert("New Appointment")}>
        🕑 Appointment schedule
      </div>
    </div>
  )}
</div>


          <div className="mini-calendar">
            <SmallCalendar onChange={setDate} value={date} />
          </div>

          <h4>My calendars</h4>
        
<div className="calendar-list">
  {events.length > 0 ? (
    events.map((event, idx) => (
      <label key={idx}>
        <input type="checkbox" defaultChecked /> {event.title}
      </label>
    ))
  ) : (
    <>
      <label><input type="checkbox" defaultChecked /> 🌍 International Holidays</label>
      <label><input type="checkbox" defaultChecked /> 🎉 New Year’s Day</label>
      <label><input type="checkbox" defaultChecked /> 🕌 Eid ul-Fitr</label>
      <label><input type="checkbox" defaultChecked /> 🎄 Christmas</label>
    </>
  )}
</div>

        </aside>

        {/* Main */}
        <main className="main">
          <div className="toolbar">
            <div className="toolbar-left">
              <button className="today" onClick={() => setDate(new Date())}>Today</button>
              <button onClick={() => setDate(moment(date).subtract(1, "month").toDate())}>
                <ChevronLeftIcon fontSize="small" />
              </button>
              <button onClick={() => setDate(moment(date).add(1, "month").toDate())}>
                <ChevronRightIcon fontSize="small" />
              </button>
              <span className="month-label">{moment(date).format("MMMM YYYY")}</span>
            </div>
            <div className="toolbar-right">
              <button onClick={() => setCurrentView(Views.DAY)}>Day</button>
              <button onClick={() => setCurrentView(Views.WEEK)}>Week</button>
              <button onClick={() => setCurrentView(Views.MONTH)}>Month</button>
              <button onClick={() => setCurrentView("year")}>Year</button> {/* 👈 NEW */}
            </div>
          </div>

          {/* Conditional: YearView or BigCalendar */}
          {currentView === "year" ? (
            <YearView date={date} onChange={setDate} />
          ) : (
            <BigCalendar
  localizer={localizer}
  events={filteredEvents}
  selectable
  startAccessor="start"
  endAccessor="end"
  view={currentView}
  onView={setCurrentView}
  date={date}
  onNavigate={setDate}
  onSelectSlot={handleSelectSlot}
  style={{ flex: 1 }}
/>

          )}
        </main>
      </div>

      {/* Floating Button */}
      <button className="floating-create-btn">
        <AddIcon style={{ fontSize: 28 }} />
      </button>

      {/* Event Popup */}
      {selectedSlot && (
        <div className="event-popup">
          <h3>Add Event</h3>
          <form onSubmit={handleAddEvent}>
            <input
              type="text"
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button className="save" type="submit">Save</button>
            <button className="cancel" type="button" onClick={() => setSelectedSlot(null)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Calendar;
