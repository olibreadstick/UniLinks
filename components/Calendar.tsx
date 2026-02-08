import React, { useState, useMemo } from "react";
import { DiscoveryItem, DiscoveryType } from "../types";

interface CalendarProps {
  savedItems: DiscoveryItem[];
  onSaveItem?: (item: DiscoveryItem) => void;
  allItems?: DiscoveryItem[];
}

const Calendar: React.FC<CalendarProps> = ({
  savedItems,
  onSaveItem,
  allItems = [],
}) => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 7)); // Feb 7, 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Get events for a specific date
  const pad = (n: number) => String(n).padStart(2, "0");
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const toDateKeyFromString = (s?: string) => (s ? s.split("T")[0] : null);

  const getEventsForDate = (date: Date) => {
    const key = toDateKey(date);
    return savedItems.filter((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      return itemDate === key;
    });
  };

  // Get all unique event dates
  const eventDates = useMemo(() => {
    const dates = new Set<string>();
    savedItems.forEach((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      if (itemDate) dates.add(itemDate);
    });
    return dates;
  }, [savedItems]);

  // Get events available on selected date (for discovery)
  const getAvailableEventsForDate = (date: Date) => {
    const key = toDateKey(date);
    return allItems.filter((item) => {
      const itemDate =
        toDateKeyFromString(item.date) ||
        toDateKeyFromString(item.metadata?.date) ||
        toDateKeyFromString(item.metadata?.startDate);
      return itemDate === key;
    });
  };

  // Get available types of events for a date
  const getEventTypesForDate = (date: Date) => {
    const events = getAvailableEventsForDate(date);
    const types = new Set(events.map((e) => e.type));
    return Array.from(types);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const daysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-3"></div>);
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day,
      );
      const dateStr = toDateKey(date);
      const hasEvents = eventDates.has(dateStr);
      const savedEventsOnDay = getEventsForDate(date);
      const availableTypesOnDay = getEventTypesForDate(date);

      days.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDateClick(date)}
          className={`p-4 rounded-lg relative transition-all text-center font-bold ${
            hasEvents
              ? "bg-mcgill-red text-white shadow-md hover:shadow-lg"
              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
          }`}
        >
          <div className="text-base">{day}</div>
          {hasEvents && (
            <div className="w-1 h-1 bg-white rounded-full mx-auto mt-1"></div>
          )}
          {availableTypesOnDay.length > 0 && !hasEvents && (
            <div className="w-1 h-1 bg-slate-300 rounded-full mx-auto mt-1"></div>
          )}
        </button>,
      );
    }

    return days;
  };

  const eventTypesOnSelectedDate = selectedDate
    ? getEventTypesForDate(selectedDate)
    : [];
  const allEventsOnSelectedDate = selectedDate
    ? getAvailableEventsForDate(selectedDate)
    : [];
  const savedEventsOnSelectedDate = selectedDate
    ? getEventsForDate(selectedDate)
    : [];

  const getTypeLabel = (type: DiscoveryType) => {
    return type.replace(/_/g, " ");
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() - 1),
              )
            }
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
          >
            ← Prev
          </button>
          <h2 className="text-2xl font-black text-slate-900">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <button
            onClick={() =>
              setCurrentDate(
                new Date(currentDate.getFullYear(), currentDate.getMonth() + 1),
              )
            }
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-slate-700"
          >
            Next →
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-center font-black text-sm text-slate-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">{renderCalendarDays()}</div>

        {/* Legend */}
        <div className="mt-6 flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-mcgill-red"></div>
            <span className="text-slate-700">Saved Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-100"></div>
            <span className="text-slate-700">Available Events</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowModal(false)}
          />
          <div className="relative z-60 max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">
                {selectedDate.toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Saved Events Section */}
              {savedEventsOnSelectedDate.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-black text-mcgill-red uppercase mb-3">
                    ✓ Your Saved Events
                  </h4>
                  <div className="flex flex-col gap-2">
                    {savedEventsOnSelectedDate.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-red-50 rounded-lg border border-red-100"
                      >
                        <div className="font-bold text-slate-900">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.type.replace(/_/g, " ")} •{" "}
                          {item.company || item.creator?.name || ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Types Section */}
              {eventTypesOnSelectedDate.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-black text-slate-700 uppercase mb-3">
                    Types of events available
                  </h4>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {eventTypesOnSelectedDate.map((type) => (
                      <span
                        key={type}
                        className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-full"
                      >
                        {getTypeLabel(type)}
                      </span>
                    ))}
                  </div>

                  {/* All Events on This Date */}
                  <div className="mt-4">
                    <h5 className="text-sm font-bold text-slate-700 mb-2">
                      Available events
                    </h5>
                    <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                      {allEventsOnSelectedDate.map((item) => {
                        const isSaved = savedItems.some(
                          (s) => s.id === item.id,
                        );
                        return (
                          <div
                            key={item.id}
                            className={`p-3 rounded-lg border ${
                              isSaved
                                ? "bg-red-50 border-red-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="font-bold text-slate-900">
                                  {item.title}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {item.type.replace(/_/g, " ")} •{" "}
                                  {item.company || item.creator?.name || ""}
                                </div>
                                <div className="text-xs text-slate-600 mt-1">
                                  {item.description}
                                </div>
                              </div>
                              {!isSaved && onSaveItem && (
                                <button
                                  onClick={() => onSaveItem(item)}
                                  className="px-3 py-1 bg-mcgill-red text-white font-bold text-xs rounded hover:bg-red-600 transition-colors whitespace-nowrap"
                                >
                                  Save
                                </button>
                              )}
                              {isSaved && (
                                <span className="px-3 py-1 bg-green-100 text-green-700 font-bold text-xs rounded whitespace-nowrap">
                                  Saved
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {eventTypesOnSelectedDate.length === 0 && (
                <div className="text-center py-6">
                  <span className="text-3xl mb-2 block">📭</span>
                  <p className="text-slate-500">
                    No events on this date. Check other dates!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
