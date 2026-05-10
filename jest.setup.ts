import '@testing-library/jest-dom';
import { mockState } from './src/test-utils/mockState';

afterEach(() => {
  mockState.reset();
  jest.clearAllMocks();
});

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

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
    setCenter: jest.fn(),
    setZoom: jest.fn(),
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
  Popup: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setDOMContent: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    on: jest.fn(),
  })),
  NavigationControl: jest.fn(),
  GeolocateControl: jest.fn(),
  AttributionControl: jest.fn(),
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
  useAuthState: jest.fn(() => [mockState.currentUser, false, null]),
}), { virtual: true });

jest.mock('react-firebase-hooks/firestore', () => ({
  useCollectionData: jest.fn((query: any) => {
    // Basic path extraction from mock query
    const path = query?._path || 'default';
    return [mockState.firestoreData[path] || [], false, null];
  }),
  useDocumentData: jest.fn((ref: any) => {
    const path = ref?._path || 'default';
    return [mockState.firestoreDocs[path] || null, false, null];
  }),
}), { virtual: true });

// Mock Firebase standard SDK
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  getApp: jest.fn(),
}));

jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
}));

jest.mock('firebase/storage', () => {
  const r = {
    put: jest.fn(() => Promise.resolve({ ref: { fullPath: "mock/path" } })),
    putString: jest.fn(() => Promise.resolve()),
    getDownloadURL: jest.fn(() => Promise.resolve("https://example.com/mock")),
    delete: jest.fn(() => Promise.resolve()),
    child: jest.fn(),
  };
  (r.child as jest.Mock).mockReturnValue(r);
  return {
    getStorage: jest.fn(() => ({})),
    ref: jest.fn(() => r),
    uploadBytes: jest.fn(() => Promise.resolve({ ref: r })),
    getDownloadURL: jest.fn(() => Promise.resolve("https://example.com/mock")),
  };
});

jest.mock('firebase/auth', () => {
  const mockUser = {
    uid: 'mock-user-123',
    email: 'portal@test.example',
    emailVerified: true,
    displayName: 'Portal Tester',
    photoURL: null,
    phoneNumber: undefined as string | undefined,
    providerData: [{ providerId: 'google.com' }],
  };

  function MockGoogleAuthProvider(this: { setCustomParameters: jest.Mock }) {
    this.setCustomParameters = jest.fn();
  }

  function MockOAuthProvider(this: { addScope: jest.Mock; setCustomParameters: jest.Mock }) {
    this.addScope = jest.fn();
    this.setCustomParameters = jest.fn();
  }

  return {
    getAuth: jest.fn(() => ({ currentUser: mockState.currentUser })),
    GoogleAuthProvider: MockGoogleAuthProvider,
    OAuthProvider: MockOAuthProvider,
    getRedirectResult: jest.fn(() => Promise.resolve(null)),
    isSignInWithEmailLink: jest.fn(() => false),
    signInWithEmailLink: jest.fn(() =>
      Promise.resolve({
        user: {
          uid: 'magic-user',
          email: 'magic@test.example',
          emailVerified: true,
          displayName: null,
          photoURL: null,
          providerData: [{ providerId: 'password' }],
        },
      }),
    ),
    sendSignInLinkToEmail: jest.fn(() => Promise.resolve()),
    signInWithRedirect: jest.fn(() => Promise.resolve()),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(() => Promise.resolve()),
    RecaptchaVerifier: jest.fn(),
    signInWithPhoneNumber: jest.fn(),
    onAuthStateChanged: jest.fn((_auth: unknown, cb: (u: unknown | null) => void) => {
      cb(mockState.currentUser);
      return jest.fn();
    }),
  };
});

jest.mock('idb', () => ({
  openDB: jest.fn(async () => ({
    put: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn(async () => []),
    count: jest.fn(async () => 0),
  })),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  initializeFirestore: jest.fn(() => ({})),
  enableMultiTabIndexedDbPersistence: jest.fn(() => Promise.resolve()),
  collection: jest.fn((_db, ...pathSegments) => {
    const path = pathSegments.join('/');
    return { _path: path, id: pathSegments[pathSegments.length - 1] };
  }),
  doc: jest.fn((_db, ...pathSegments) => {
    const path = pathSegments.join('/');
    return { _path: path, id: pathSegments[pathSegments.length - 1] };
  }),
  getDoc: jest.fn((ref) => {
    const path = ref?._path || 'default';
    const data = mockState.firestoreDocs[path];
    return Promise.resolve({
      exists: () => !!data,
      data: () => data,
      id: ref.id,
    });
  }),
  getDocFromCache: jest.fn(() => Promise.reject(new Error('no cache'))),
  getDocs: jest.fn((query) => {
    const path = query?._path || 'default';
    const docs = (mockState.firestoreData[path] || []).map(d => ({
      data: () => d,
      id: d.id || 'mock-id'
    }));
    return Promise.resolve({
      docs,
      empty: docs.length === 0,
      forEach: (cb: any) => docs.forEach(cb),
    });
  }),
  setDoc: jest.fn(() => Promise.resolve()),
  updateDoc: jest.fn(() => Promise.resolve()),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc' })),
  deleteDoc: jest.fn(() => Promise.resolve()),
  query: jest.fn((ref) => ref),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  Timestamp: {
    now: jest.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
    fromMillis: jest.fn((ms) => ({ toMillis: () => ms, toDate: () => new Date(ms) })),
  },
  onSnapshot: jest.fn((refOrQuery, callback) => {
    const path = refOrQuery?._path || 'default';
    const data = mockState.firestoreDocs[path];
    const docs = mockState.firestoreData[path] || [];
    
    if (typeof callback === 'function') {
      callback({
        exists: () => !!data,
        data: () => data,
        docs: docs.map(d => ({ data: () => d, id: d.id || 'mock-id' })),
        forEach: (cb: any) => docs.forEach(d => cb({ data: () => d, id: d.id || 'mock-id' })),
      });
    }
    return jest.fn();
  }),
}));

// Mock the core firebase config to return the mocked instances
jest.mock('@/core/config/firebase', () => ({
  app: {},
  db: {},
  firestore: {},
  auth: { currentUser: null },
  storage: {},
  isConfigured: true,
}));

// JSDOM has no Web Speech API; dictation hook checks `window.SpeechRecognition`.
if (typeof window !== "undefined") {
  class JestMockSpeechRecognition {
    lang = "";
    continuous = false;
    interimResults = false;
    onresult: ((e: unknown) => void) | null = null;
    onerror: ((e: { error?: string }) => void) | null = null;
    onend: (() => void) | null = null;
    start = jest.fn();
    stop = jest.fn();
    abort = jest.fn();
  }

  Object.defineProperty(window, "SpeechRecognition", {
    writable: true,
    configurable: true,
    value: JestMockSpeechRecognition,
  });
}
