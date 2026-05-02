import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserProfile from '../UserProfile';

describe('UserProfile', () => {
  it('renders initial profile correctly', () => {
    render(<UserProfile />);
    
    expect(screen.getByTestId('profile-name')).toHaveTextContent('ASLAMBECK');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('ADMIN');
  });

  it('navigates to next profile when next button is clicked', () => {
    render(<UserProfile />);
    
    const nextBtn = screen.getByTestId('next-profile-btn');
    fireEvent.click(nextBtn);
    
    expect(screen.getByTestId('profile-name')).toHaveTextContent('TIMOUR');
    expect(screen.getByTestId('profile-role')).toHaveTextContent('ADMIN');
  });

  it('cycles back to first profile when next is clicked at the end', () => {
    render(<UserProfile />);
    
    const nextBtn = screen.getByTestId('next-profile-btn');
    // We have 2 profiles. Click twice to cycle back.
    fireEvent.click(nextBtn); // Go to TIMOUR
    fireEvent.click(nextBtn); // Go to ASLAMBECK
    
    expect(screen.getByTestId('profile-name')).toHaveTextContent('ASLAMBECK');
  });

  it('navigates to previous profile when prev button is clicked', () => {
    render(<UserProfile />);
    
    const prevBtn = screen.getByTestId('prev-profile-btn');
    // Clicking prev on the first profile should wrap to the last profile
    fireEvent.click(prevBtn);
    
    expect(screen.getByTestId('profile-name')).toHaveTextContent('TIMOUR');
  });
});
