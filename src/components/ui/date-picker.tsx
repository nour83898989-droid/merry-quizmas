'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface DatePickerProps {
  value: string; // ISO datetime string
  onChange: (value: string) => void;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date & time',
  minDate = new Date(),
  disabled = false,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  const [selectedTime, setSelectedTime] = useState(value ? new Date(value).toTimeString().slice(0, 5) : '12:00');
  const [openAbove, setOpenAbove] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Calculate if popup should open above or below
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const popupHeight = 420; // Approximate height of calendar popup
    
    // Open above if not enough space below and more space above
    setOpenAbove(spaceBelow < popupHeight && spaceAbove > spaceBelow);
  }, []);

  // Parse value on mount
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setSelectedTime(date.toTimeString().slice(0, 5));
      setViewDate(date);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recalculate position on open and scroll
  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
      return () => {
        window.removeEventListener('scroll', calculatePosition, true);
        window.removeEventListener('resize', calculatePosition);
      };
    }
  }, [isOpen, calculatePosition]);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleDateSelect = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    setSelectedDate(newDate);
    
    // Combine with time
    const [hours, minutes] = selectedTime.split(':').map(Number);
    newDate.setHours(hours, minutes, 0, 0);
    
    // Format as datetime-local value
    const isoString = newDate.toISOString().slice(0, 16);
    onChange(isoString);
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
    
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      const [hours, minutes] = time.split(':').map(Number);
      newDate.setHours(hours, minutes, 0, 0);
      
      const isoString = newDate.toISOString().slice(0, 16);
      onChange(isoString);
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
    setSelectedTime('12:00');
    onChange('');
    setIsOpen(false);
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return date < min;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return viewDate.getFullYear() === today.getFullYear() &&
           viewDate.getMonth() === today.getMonth() &&
           day === today.getDate();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return viewDate.getFullYear() === selectedDate.getFullYear() &&
           viewDate.getMonth() === selectedDate.getMonth() &&
           day === selectedDate.getDate();
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + selectedTime;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!disabled) {
            calculatePosition();
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border text-left transition-all flex items-center justify-between ${
          disabled
            ? 'bg-surface/50 border-foreground/5 cursor-not-allowed'
            : isOpen
            ? 'border-primary bg-primary/5'
            : 'border-foreground/10 hover:border-foreground/30 bg-surface'
        }`}
      >
        <span className={selectedDate ? 'text-foreground' : 'text-foreground-muted'}>
          {selectedDate ? formatDisplayValue() : placeholder}
        </span>
        <CalendarIcon className="w-5 h-5 text-foreground-muted" />
      </button>

      {/* Calendar Popup - mobile-friendly with fixed positioning on small screens */}
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
          
          <div 
            className={`
              fixed md:absolute z-50 
              left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0
              w-[calc(100vw-2rem)] md:w-80 max-w-80
              p-4 rounded-xl border border-foreground/10 bg-surface shadow-xl
              ${openAbove 
                ? 'md:bottom-full md:mb-2 bottom-4' 
                : 'md:top-full md:mt-2 top-1/2 md:top-auto -translate-y-1/2 md:translate-y-0'
              }
              max-h-[80vh] overflow-y-auto
            `}
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5 text-foreground" />
              </button>
              <span className="font-medium text-foreground">
                {monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Day Names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs text-foreground-muted py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before first of month */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}
              
              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const disabled = isDateDisabled(day);
                const today = isToday(day);
                const selected = isSelected(day);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !disabled && handleDateSelect(day)}
                    disabled={disabled}
                    className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                      disabled
                        ? 'text-foreground/20 cursor-not-allowed'
                        : selected
                        ? 'bg-primary text-white'
                        : today
                        ? 'bg-primary/20 text-primary hover:bg-primary/30'
                        : 'text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {/* Time Picker */}
            <div className="mt-4 pt-4 border-t border-foreground/10">
              <label className="block text-sm text-foreground-muted mb-2">Time</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-foreground/10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 px-3 py-2 rounded-lg border border-foreground/10 text-foreground-muted hover:bg-foreground/5 transition-colors text-sm"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-sm"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
