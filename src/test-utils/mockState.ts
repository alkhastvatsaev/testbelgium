/**
 * Shared state for unit test mocks.
 * This allows individual tests to set the return values of global mocks
 * defined in jest.setup.ts.
 */
export const mockState = {
  currentUser: {
    uid: 'mock-user-123',
    email: 'test@example.com',
    emailVerified: true,
    displayName: 'Test User',
    photoURL: null,
    providerData: [{ providerId: 'google.com' }],
    getIdToken: async () => 'mock-token',
  } as any,
  
  firestoreData: {} as Record<string, any[]>,
  firestoreDocs: {} as Record<string, any>,
  
  // Helpers to reset state between tests
  reset() {
    this.currentUser = {
      uid: 'mock-user-123',
      email: 'test@example.com',
      emailVerified: true,
      displayName: 'Test User',
      photoURL: null,
      providerData: [{ providerId: 'google.com' }],
      getIdToken: async () => 'mock-token',
    };
    this.firestoreData = {};
    this.firestoreDocs = {};
  }
};
