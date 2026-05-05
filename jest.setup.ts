import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// Polyfills / browser APIs absent from JSDOM (jspdf, cmdk, etc.)
if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder as typeof globalThis.TextEncoder;
}
if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder;
}

globalThis.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// --- GLOBAL MOCKS FOR AI TESTING ARCHITECTURE ---

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      prefetch: () => null,
      push: () => null,
      replace: () => null,
      back: () => null,
      forward: () => null,
      refresh: () => null,
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock mapbox-gl to avoid WebGL errors in JSDOM
jest.mock('mapbox-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    remove: jest.fn(),
    flyTo: jest.fn(),
    fitBounds: jest.fn(),
    setCenter: jest.fn(),
    setZoom: jest.fn(),
    setConfigProperty: jest.fn(),
    getCenter: jest.fn(() => ({ toArray: () => [4.3522, 50.8466] as [number, number] })),
    getZoom: jest.fn(() => 15),
    addControl: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    removeSource: jest.fn(),
    getLayer: jest.fn(),
    getSource: jest.fn(),
  })),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    setElement: jest.fn().mockReturnThis(),
  })),
  LngLatBounds: jest.fn().mockImplementation(() => ({
    extend: jest.fn(),
    getCenter: jest.fn(() => ({ toArray: () => [4.3522, 50.8466] as [number, number] })),
  })),
  Popup: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setDOMContent: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    on: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn(),
  supported: jest.fn(() => true),
}));

// Mock framer-motion to skip animations
jest.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: {
      div: React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement('div', { ref, ...rest });
      }),
      span: React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement('span', { ref, ...rest });
      }),
      button: React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement('button', { ref, ...rest });
      }),
    },
    AnimatePresence: ({ children }: any) => children,
    useAnimation: () => ({ start: jest.fn(), stop: jest.fn() }),
  };
});

// Mock react-firebase-hooks
jest.mock('react-firebase-hooks/auth', () => ({
  useAuthState: jest.fn(() => [{ uid: 'mock-user-123', email: 'test@example.com' }, false, null]),
}), { virtual: true });

jest.mock('react-firebase-hooks/firestore', () => ({
  useCollectionData: jest.fn(() => [[], false, null]),
  useDocumentData: jest.fn(() => [null, false, null]),
}), { virtual: true });

// Mock Firebase standard SDK
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'mock-user-123' } })),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn((_refOrQuery, callback) => {
    if (typeof callback === 'function') {
      callback({
        exists: () => false,
        data: () => undefined,
        docs: [],
      });
    }
    return jest.fn();
  }),
}));
