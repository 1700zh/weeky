import React, { useState, useRef, useEffect } from "react";
import "./WeekScheduler.css";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const timeSlots = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8;
  return `${hour.toString().padStart(2, "0")}:00 - ${(hour + 1).toString().padStart(2, "0")}:00`;
});

const lockedSlots = new Set(["Sun-08:00 - 09:00", "Sat-19:00 - 20:00"]);

export default function WeekScheduler() {
  const [availability, setAvailability] = useState({});
  const [mode, setMode] = useState("available");
  const [weekOffset, setWeekOffset] = useState(0);
  const isDragging = useRef(false);
  const dragStart = useRef(null);

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  currentWeekStart.setHours(0, 0, 0, 0);

  const currentViewStart = new Date(today);
  currentViewStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);
  currentViewStart.setHours(0, 0, 0, 0);

  const isPastWeek = currentViewStart < currentWeekStart;
  const currentWeekKey = currentViewStart.toISOString().split("T")[0];

  useEffect(() => {
    const saved = localStorage.getItem("week-scheduler-availability");
    if (saved) {
      try {
        setAvailability(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("week-scheduler-availability", JSON.stringify(availability));
  }, [availability]);

  const toggleCell = (day, time) => {
    if (isPastWeek) return;
    const key = `${day}-${time}`;
    if (lockedSlots.has(key)) return;

    setAvailability((prev) => {
      const updated = { ...prev };
      const week = { ...(updated[currentWeekKey] || {}) };
      if (week[key] === mode) {
        delete week[key];
      } else {
        week[key] = mode;
      }
      updated[currentWeekKey] = week;
      return updated;
    });
  };

  const handleMouseDown = (day, time) => {
    if (isPastWeek) return;
    isDragging.current = true;
    dragStart.current = `${day}-${time}`;
    toggleCell(day, time);
  };

  const handleMouseEnter = (day, time) => {
    if (isDragging.current) {
      toggleCell(day, time);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    dragStart.current = null;
  };

  const handleClear = () => {
    setAvailability((prev) => ({ ...prev, [currentWeekKey]: {} }));
  };

  const handleExport = () => {
    const result = availability;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "weekly-schedule.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setAvailability((prev) => {
      const updated = { ...prev };
      updated[currentWeekKey] = {}; // clear current week selection
      return updated;
    });
  };

  const getWeekLabel = () => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return `${startOfWeek.toLocaleDateString()} ~ ${endOfWeek.toLocaleDateString()}`;
  };

  const currentWeekData = availability[currentWeekKey] || {};

  return (
    <div className="week-scheduler" onMouseUp={handleMouseUp}>
      <div className="scheduler-header">
        <h2>Select Weekly Availability</h2>
        <div className="week-nav">
          <button className="btn nav" onClick={() => setWeekOffset((prev) => prev - 1)}>Previous Week</button>
          <span className="week-label">{getWeekLabel()}</span>
          <button className="btn nav" onClick={() => setWeekOffset((prev) => prev + 1)}>Next Week</button>
        </div>
        <div className="action-buttons">
          <button className={`btn mode ${mode === "available" ? "active" : ""}`} onClick={() => handleModeChange("available")}>Available</button>
          <button className={`btn mode ${mode === "unavailable" ? "active" : ""}`} onClick={() => handleModeChange("unavailable")}>Not Available</button>
          <button className="btn clear" onClick={handleClear}>Clear</button>
          <button className="btn export" onClick={handleExport}>Export</button>
        </div>
      </div>

      <div className="header-row">
        <div className="time-label"></div>
        {days.map((day) => (
          <div key={day} className="day-header">{day}</div>
        ))}
      </div>

      {timeSlots.map((time) => (
        <div className="time-row" key={time}>
          <div className="time-label">{time}</div>
          {days.map((day) => {
            const key = `${day}-${time}`;
            const isLocked = lockedSlots.has(key);
            const status = currentWeekData[key];
            return (
              <div
                key={key}
                className={`cell ${status === "available" ? "selected" : ""} ${status === "unavailable" ? "unavailable" : ""} ${isLocked || isPastWeek ? "locked" : ""}`}
                onMouseDown={() => handleMouseDown(day, time)}
                onMouseEnter={() => handleMouseEnter(day, time)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}