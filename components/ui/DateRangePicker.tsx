"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DateRangePickerProps {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  onChange: (startDate: string, endDate: string) => void
  onClear: () => void
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${m}/${d}/${y}`
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  onClear
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Month stats
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // First day of the month index (0 = Sunday, 1 = Monday, etc.)
  const firstDayIndex = new Date(year, month, 1).getDay()
  const numDays = new Date(year, month + 1, 0).getDate()

  // Previous month padding days
  const prevMonthNumDays = new Date(year, month, 0).getDate()
  const prevDays = Array.from({ length: firstDayIndex }, (_, i) => prevMonthNumDays - firstDayIndex + 1 + i)

  // Current month days
  const days = Array.from({ length: numDays }, (_, i) => i + 1)

  // Next month padding days
  const totalCells = firstDayIndex + numDays
  const nextDaysCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7)
  const nextDays = Array.from({ length: nextDaysCount }, (_, i) => i + 1)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const handleDayClick = (day: number, isCurrentMonth = true) => {
    let clickedDate = ''
    if (isCurrentMonth) {
      clickedDate = toDateString(new Date(year, month, day))
    } else if (day > 15) {
      // Clicked previous month day
      clickedDate = toDateString(new Date(year, month - 1, day))
    } else {
      // Clicked next month day
      clickedDate = toDateString(new Date(year, month + 1, day))
    }

    if (!startDate || (startDate && endDate)) {
      onChange(clickedDate, '')
    } else {
      // startDate is selected, but not endDate
      if (clickedDate < startDate) {
        onChange(clickedDate, '')
      } else {
        onChange(startDate, clickedDate)
        setIsOpen(false)
      }
    }
  }

  const handlePresetClick = (preset: string) => {
    const today = new Date()
    let start = new Date()
    let end = new Date()

    switch (preset) {
      case 'today':
        start = today
        end = today
        break
      case 'yesterday':
        start = new Date(today)
        start.setDate(today.getDate() - 1)
        end = new Date(start)
        break
      case 'last7':
        start = new Date(today)
        start.setDate(today.getDate() - 6)
        end = today
        break
      case 'last30':
        start = new Date(today)
        start.setDate(today.getDate() - 29)
        end = today
        break
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = today
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      default:
        return
    }

    onChange(toDateString(start), toDateString(end))
    setIsOpen(false)
  }

  // Check if a date string is in the selected or hovered range
  const isDateSelected = (dateStr: string) => {
    return dateStr === startDate || dateStr === endDate
  }

  const isDateInRange = (dateStr: string) => {
    if (startDate && endDate) {
      return dateStr > startDate && dateStr < endDate
    }
    if (startDate && hoveredDate) {
      return dateStr > startDate && dateStr < hoveredDate
    }
    return false
  }

  const isCurrentPreset = (preset: string) => {
    const today = toDateString(new Date())
    const yesterday = toDateString(new Date(Date.now() - 86400000))
    const last7 = toDateString(new Date(Date.now() - 6 * 86400000))
    const last30 = toDateString(new Date(Date.now() - 29 * 86400000))
    const thisMonthStart = toDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    const lastMonthStart = toDateString(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1))
    const lastMonthEnd = toDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 0))

    switch (preset) {
      case 'today':
        return startDate === today && endDate === today
      case 'yesterday':
        return startDate === yesterday && endDate === yesterday
      case 'last7':
        return startDate === last7 && endDate === today
      case 'last30':
        return startDate === last30 && endDate === today
      case 'thisMonth':
        return startDate === thisMonthStart && endDate === today
      case 'lastMonth':
        return startDate === lastMonthStart && endDate === lastMonthEnd
      default:
        return false
    }
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-w-[240px] cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 shadow-sm ring-indigo-500/20 transition-all hover:bg-slate-50 focus-within:ring-2"
        role="button"
        tabIndex={0}
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="font-semibold text-slate-700 select-none">
            {startDate && endDate ? (
              <span className="text-indigo-600 font-bold">
                {formatDisplayDate(startDate)} — {formatDisplayDate(endDate)}
              </span>
            ) : startDate ? (
              <span className="text-slate-500 font-medium">
                {formatDisplayDate(startDate)} — ...
              </span>
            ) : (
              <span className="text-slate-400 font-normal">Select date range</span>
            )}
          </span>
        </div>
        {startDate || endDate ? (
          <button
            type="button"
            className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            aria-label="Clear date filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 flex rounded-xl border border-slate-250 bg-white shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Presets Sidebar */}
          <div className="w-40 border-r border-slate-100 bg-slate-50/50 p-2.5 flex flex-col gap-1">
            <div className="px-2 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets</div>
            <button
              onClick={() => handlePresetClick('today')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('today') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => handlePresetClick('yesterday')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('yesterday') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => handlePresetClick('last7')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('last7') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handlePresetClick('last30')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('last30') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => handlePresetClick('thisMonth')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('thisMonth') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => handlePresetClick('lastMonth')}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                isCurrentPreset('lastMonth') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
              }`}
            >
              Last Month
            </button>
          </div>

          {/* Calendar Section */}
          <div className="p-4 w-72">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                {monthNames[month]} {year}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Week Days Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-1 text-xs">
              {/* Prev Month Padding */}
              {prevDays.map((d, index) => {
                const dateStr = toDateString(new Date(year, month - 1, d))
                return (
                  <button
                    key={`prev-${index}`}
                    type="button"
                    onClick={() => handleDayClick(d, false)}
                    className="h-8 w-8 mx-auto text-slate-350 text-[11px]"
                  >
                    {d}
                  </button>
                )
              })}

              {/* Current Month Days */}
              {days.map((d) => {
                const dateStr = toDateString(new Date(year, month, d))
                const selected = isDateSelected(dateStr)
                const inRange = isDateInRange(dateStr)
                const isStart = dateStr === startDate
                const isEnd = dateStr === endDate

                return (
                  <button
                    key={`day-${d}`}
                    type="button"
                    onClick={() => handleDayClick(d, true)}
                    onMouseEnter={() => startDate && !endDate && setHoveredDate(dateStr)}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`h-8 w-8 mx-auto flex items-center justify-center rounded-full font-semibold transition ${
                      selected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : inRange
                        ? 'bg-indigo-50 text-indigo-700 rounded-none w-full'
                        : 'text-slate-650 hover:bg-slate-100'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}

              {/* Next Month Padding */}
              {nextDays.map((d, index) => {
                const dateStr = toDateString(new Date(year, month + 1, d))
                return (
                  <button
                    key={`next-${index}`}
                    type="button"
                    onClick={() => handleDayClick(d, false)}
                    className="h-8 w-8 mx-auto text-slate-350 text-[11px]"
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
