/**
 * Feature Flags & App Configuration
 * 
 * USE_MOCK_CHAT:
 *   true  → Trip chat uses MockChatService (no backend needed)  — Week 3-4
 *   false → Trip chat uses RealChatService (calls FastAPI)       — Week 5+
 */
export const CONFIG = {
    USE_MOCK_CHAT: false,
  };