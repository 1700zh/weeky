import React, { useState, useRef, useEffect } from "react";
import "./WeekScheduler.css";
import {
  getOrCreateGroupId,
  getStorageKey,
  getShareLink,
  getOrCreateUserId,
} from "./GroupManager";
import {
  uploadAvailability,
  submitAvailability,
  subscribeToGroupAvailability,
} from "./firestoreService";

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const timeSlots = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 8;
  return `${hour.toString().padStart(2, "0")}:00`;
});

const lockedSlots = new Set();

export default function WeekScheduler() {
  const [availability, setAvailability] = useState({});
  const [mode] = useState("available");
  const [weekOffset, setWeekOffset] = useState(0);
  const [groupData, setGroupData] = useState({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showRatio, setShowRatio] = useState(false);

  const groupId = useRef(getOrCreateGroupId()).current;
  const userId = useRef(getOrCreateUserId()).current;
  const storageKey = getStorageKey(groupId);
  const isDragging = useRef(false);
  const dragStart = useRef(null);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const toggleMode = () => setShowRatio((prev) => !prev);

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
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setAvailability(JSON.parse(saved));
      } catch {}
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(availability));
    uploadAvailability(groupId, userId, availability);
  }, [availability]);

  useEffect(() => {
    const unsubscribe = subscribeToGroupAvailability(groupId, (data) => {
      setGroupData(data);
      setHasSubmitted(data?.[userId]?.submitted || false);
    });
    return () => unsubscribe();
  }, [groupId]);

  const handleSubmit = async () => {
    await uploadAvailability(groupId, userId, availability);
    await submitAvailability(groupId, userId);
    setHasSubmitted(true);
  };

  const handleSelectAll = () => {
    const allSlots = {};
    days.forEach((day) => {
      timeSlots.forEach((time) => {
        const key = `${day}-${time}`;
        const slotDateTime = getSlotDateTime(day, time);
        if (!lockedSlots.has(key) && slotDateTime >= new Date()) {
          allSlots[key] = "available";
        }
      });
    });

    setAvailability((prev) => ({
      ...prev,
      [currentWeekKey]: allSlots,
    }));
  };

  const totalUsers = Object.keys(groupData).length;
  const submittedUsers = Object.values(groupData).filter((u) => u?.submitted).length;

  const slotAvailabilityRatio = {};
  if (submittedUsers >= 1) {
    const allWeekData = Object.values(groupData)
      .filter((u) => u?.submitted)
      .map((u) => u?.availability?.[currentWeekKey] || {});
    const counts = {};
    allWeekData.forEach((userData) => {
      Object.entries(userData).forEach(([slot, value]) => {
        if (value === "available") {
          counts[slot] = (counts[slot] || 0) + 1;
        }
      });
    });
    Object.entries(counts).forEach(([slot, count]) => {
      slotAvailabilityRatio[slot] = count / submittedUsers;
    });
  }

  const toggleCell = (day, time) => {
    if (isPastWeek) return;
  
    const key = `${day}-${time}`;
    const slotDateTime = getSlotDateTime(day, time);
    if (lockedSlots.has(key) || slotDateTime < new Date()) return;
  
    setAvailability((prev) => {
      const prevWeek = prev[currentWeekKey] || {};
      const updatedWeek = { ...prevWeek };
  
      // 开关状态
      if (updatedWeek[key] === "available") {
        delete updatedWeek[key];
      } else {
        updatedWeek[key] = "available";
      }
  
      const newAvailability = {
        ...prev,
        [currentWeekKey]: updatedWeek,
      };
  
      // ✅ 一定要传 newAvailability，而不是旧 availability
      uploadAvailability(groupId, userId, newAvailability);
  
      // ✅ 还要刷新 groupData，确保前端比值显示及时
      setGroupData((prevGroup) => {
        const newGroup = { ...prevGroup };
        const user = newGroup[userId] || {};
        const userAvailability = { ...(user.availability || {}) };
        userAvailability[currentWeekKey] = updatedWeek;
        newGroup[userId] = { ...user, availability: userAvailability };
        return newGroup;
      });
  
      return newAvailability;
    });
  };
  
  

  const getSlotDateTime = (day, time) => {
    const [startHour] = time.split(":");
    const slotDate = new Date(currentViewStart);
    const dayIndex = days.indexOf(day);
    slotDate.setDate(currentViewStart.getDate() + dayIndex);
    slotDate.setHours(parseInt(startHour), 0, 0, 0);
    return slotDate;
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

  const handleCopyLink = () => {
    const link = getShareLink(groupId);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => alert("Link copied to clipboard!"))
        .catch(() => alert("Failed to copy link."));
    } else {
      window.prompt(
        "Your browser does not support auto-copy. Please copy the link below:",
        link
      );
    }
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
      </div>

      <div className="header-row">
        {days.map((day) => (
          <div key={day} className="day-header">{day}</div>
        ))}
      </div>

      {timeSlots.map((time) => (
        <React.Fragment key={time}>
          <div className="time-header"><span>{time}</span></div>
          <div className="time-row">
            {days.map((day) => {
              const key = `${day}-${time}`;
              const slotDateTime = getSlotDateTime(day, time);
              const isTimePast = slotDateTime < new Date();
              const isLocked = lockedSlots.has(key) || isTimePast;
              const status = currentWeekData[key];

              let heatLevel = "";
              const ratio = slotAvailabilityRatio[key];
              if (!showRatio) {
                if (ratio >= 0.9) heatLevel = "heat-10";
                else if (ratio >= 0.8) heatLevel = "heat-9";
                else if (ratio >= 0.7) heatLevel = "heat-8";
                else if (ratio >= 0.6) heatLevel = "heat-7";
                else if (ratio >= 0.5) heatLevel = "heat-6";
                else if (ratio >= 0.4) heatLevel = "heat-5";
                else if (ratio >= 0.3) heatLevel = "heat-4";
                else if (ratio >= 0.2) heatLevel = "heat-3";
                else if (ratio >= 0.1) heatLevel = "heat-2";
                else if (ratio > 0) heatLevel = "heat-1";
              }

              return (
                <div
                  key={key}
                  className={`cell ${status === "available" ? "selected" : ""} ${
                    isLocked ? "locked" : ""
                  } ${showRatio ? "ratio-mode" : heatLevel}`}
                  onClick={() => toggleCell(day, time)}
                >
                  {showRatio && submittedUsers > 0 && !isLocked && (
                    <span className="ratio-label">
                      {Math.round((ratio || 0) * submittedUsers)}/{submittedUsers}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </React.Fragment>
      ))}

      <div className={`fab-container ${menuOpen ? "open" : ""}`}>
        <button className="fab-toggle" onClick={toggleMenu}>☰</button>
        {menuOpen && (
          <div className="fab-actions">
            <button className="btn selectall" onClick={handleSelectAll}>Select All</button>
            <button className="btn clear" onClick={handleClear}>Clear</button>
            <button className="btn export" onClick={handleCopyLink}>Share</button>
            <button className="btn nav" onClick={handleSubmit}>
              {hasSubmitted ? "Resubmit" : "Submit"}
            </button>
            <button className="btn mode" onClick={toggleMode}>
              {showRatio ? "Show Heatmap" : "Show Ratio"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
