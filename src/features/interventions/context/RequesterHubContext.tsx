"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type RequesterType = "particulier" | "societe";

export interface RequesterProfile {
  type: RequesterType;
  firstName: string;
  lastName: string;
  companyName: string;
  phone: string;
  defaultAddress: string;
  defaultLatLng?: { lat: number; lng: number };
  accessCode: string;
}

export interface InterventionRequestData {
  problemLabel: string;
  description: string;
  urgency: boolean;
  photoDataUrls: string[];
  interventionAddress: string;
  interventionLatLng?: { lat: number; lng: number };
  interventionDate?: string;
  interventionTime?: string;
}

interface RequesterHubContextValue {
  profile: RequesterProfile;
  setProfile: React.Dispatch<React.SetStateAction<RequesterProfile>>;
  requestData: InterventionRequestData;
  setRequestData: React.Dispatch<React.SetStateAction<InterventionRequestData>>;
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  lastSubmittedRequest: InterventionRequestData | null;
  setLastSubmittedRequest: (request: InterventionRequestData | null) => void;
  isSubmitting: boolean;
  setIsSubmitting: (val: boolean) => void;
  validationFailedCount: number;
  triggerValidation: () => void;
  resetRequestOnly: () => void;
  resetAll: () => void;
}

const defaultProfile: RequesterProfile = {
  type: "particulier",
  firstName: "",
  lastName: "",
  companyName: "",
  phone: "",
  defaultAddress: "",
  accessCode: "",
};

const defaultRequestData: InterventionRequestData = {
  problemLabel: "",
  description: "",
  urgency: false,
  photoDataUrls: [],
  interventionAddress: "",
  interventionDate: "",
  interventionTime: "",
};

const RequesterHubContext = createContext<RequesterHubContextValue | null>(null);

const STORAGE_KEY = "map-belgique-requester-draft-v1";

export function RequesterHubProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<RequesterProfile>(defaultProfile);
  const [requestData, setRequestData] = useState<InterventionRequestData>(defaultRequestData);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastSubmittedRequest, setLastSubmittedRequest] = useState<InterventionRequestData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationFailedCount, setValidationFailedCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.profile) setProfile(parsed.profile);
        if (parsed.requestData) setRequestData(parsed.requestData);
        if (parsed.lastSubmittedRequest) setLastSubmittedRequest(parsed.lastSubmittedRequest);
      }
    } catch {
      // ignore
    }
    setIsHydrated(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile, requestData, lastSubmittedRequest }));
    } catch {
      // ignore
    }
  }, [profile, requestData, lastSubmittedRequest, isHydrated]);

  const triggerValidation = () => setValidationFailedCount((v) => v + 1);

  const resetRequestOnly = () => {
    setRequestData(defaultRequestData);
    setCurrentStep(0);
    setValidationFailedCount(0);
  };

  const resetAll = () => {
    setProfile(defaultProfile);
    setRequestData(defaultRequestData);
    setCurrentStep(0);
    setLastSubmittedRequest(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <RequesterHubContext.Provider
      value={{
        profile,
        setProfile,
        requestData,
        setRequestData,
        currentStep,
        setCurrentStep,
        lastSubmittedRequest,
        setLastSubmittedRequest,
        isSubmitting,
        setIsSubmitting,
        validationFailedCount,
        triggerValidation,
        resetRequestOnly,
        resetAll,
      }}
    >
      {children}
    </RequesterHubContext.Provider>
  );
}

export function useRequesterHub() {
  const context = useContext(RequesterHubContext);
  if (!context) {
    throw new Error("useRequesterHub must be used within a RequesterHubProvider");
  }
  return context;
}
