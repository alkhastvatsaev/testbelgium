import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClockCalendar from '../ClockCalendar';
import { useDateContext } from '@/context/DateContext';

jest.mock('@/context/DateContext', () => ({
  useDateContext: jest.fn(),
}));

describe('ClockCalendar', () => {
  let mockSetSelectedDate: jest.Mock;
  const mockDate = new Date('2024-05-15T12:00:00Z');

  beforeEach(() => {
    mockSetSelectedDate = jest.fn();
    jest.useFakeTimers();
    jest.setSystemTime(mockDate);
    (useDateContext as jest.Mock).mockReturnValue({
      selectedDate: mockDate,
      setSelectedDate: mockSetSelectedDate,
    });
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders correctly with initial date and time', () => {
    render(<ClockCalendar />);

    // Time display should be visible
    expect(screen.getByTestId('time-display')).toBeInTheDocument();
    
    // Date display should be visible
    expect(screen.getByTestId('date-display')).toBeInTheDocument();
  });

  it('opens calendar when clicked', () => {
    render(<ClockCalendar />);

    const widget = screen.getByTestId('clock-calendar-widget');
    
    // Initially calendar is not open (has state-clock class)
    expect(widget).toHaveClass('state-clock');
    
    // Click to open calendar
    fireEvent.click(widget);
    
    // Should change class to state-calendar
    expect(widget).toHaveClass('state-calendar');
    
    // Calendar month/year should be visible
    // "mai 2024" in French locale
    expect(screen.getByText(/mai 2024/i)).toBeInTheDocument();
  });

  it('navigates days with prev/next buttons when calendar is closed', () => {
    render(<ClockCalendar />);

    // Calendar is closed, so buttons are visible
    const prevDayBtn = screen.getByTestId('prev-day-btn');
    const nextDayBtn = screen.getByTestId('next-day-btn');

    // Click previous day
    fireEvent.click(prevDayBtn);
    
    // Should call setSelectedDate with previous day (May 14)
    expect(mockSetSelectedDate).toHaveBeenCalledWith(new Date('2024-05-14T12:00:00Z'));

    // Click next day
    fireEvent.click(nextDayBtn);
    
    // Should call setSelectedDate with next day (May 16)
    // Need to get the latest call to match since we clicked both
    expect(mockSetSelectedDate).toHaveBeenCalledWith(new Date('2024-05-16T12:00:00Z'));
  });

  it('navigates months and selects a day when calendar is open', () => {
    render(<ClockCalendar />);

    const widget = screen.getByTestId('clock-calendar-widget');
    
    // Open calendar
    fireEvent.click(widget);
    
    // Calendar is open, month navigation buttons are visible
    const prevMonthBtn = screen.getByTestId('prev-month-btn');
    const nextMonthBtn = screen.getByTestId('next-month-btn');

    // Click previous month
    fireEvent.click(prevMonthBtn);
    
    // Month display should update to April
    expect(screen.getByText(/avril 2024/i)).toBeInTheDocument();

    // Select the 10th of the month
    const day10 = screen.getByTestId('calendar-day-10');
    fireEvent.click(day10);

    // It should call setSelectedDate with the selected date (April 10, 2024)
    // Note: mockDate was set to 2024-05-15T12:00:00Z, so changing to April makes it 2024-04-10
    expect(mockSetSelectedDate).toHaveBeenCalledWith(new Date(2024, 3, 10));
  });

  it('updates time every second', () => {
    render(<ClockCalendar />);

    // Time is dynamic based on locale, but we know the mocked time is 12:00:00 (may change timezone, so let's just check the element exists and updates)
    const timeDisplay = screen.getByTestId('time-display');
    const initialTimeStr = timeDisplay.textContent;

    // Advance time by 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Time should have updated
    expect(timeDisplay.textContent).not.toEqual(initialTimeStr);
  });
});
