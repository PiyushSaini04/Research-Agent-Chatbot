import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock process.env
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.RAPIDAPI_KEY = 'mock-rapidapi-key';
process.env.RAPIDAPI_HOST = 'mock-rapidapi-host';
process.env.TAVILY_API_KEY = 'mock-tavily-key';
process.env.GOOGLE_GEMINI_API_KEY = 'mock-gemini-key';

// Mock fetch globally
global.fetch = vi.fn();
