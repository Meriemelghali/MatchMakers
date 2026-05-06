export const environment = {
  production: false,
  userServiceUrl:    'http://localhost:8081',
  reclamationServiceUrl: 'http://localhost:8082/reclamations/api/reclamations',
  sportServiceUrl:   'http://localhost:8084/sports',
  eventServiceUrl:   'http://localhost:8083/api/events',
  matchServiceUrl: 'http://localhost:8087/matchs',
  socialServiceUrl: 'http://localhost:8090/social/api/posts',
  reservationServiceUrl: 'http://localhost:8089/reservations/api/reservations',
  apiUrl: 'http://localhost:8088/api/v1/auth',
  terrainServiceUrl: 'http://localhost:8088/terrain',
  teamServiceUrl: 'http://localhost:8085/teams/api/teams',
  rewardServiceUrl: 'http://localhost:8086/rewards/api/rewards',
  // Free/local LLM service (no API key). See /PythonAI for the FastAPI + Ollama service.
  // Use 127.0.0.1 to avoid IPv6 localhost (::1) issues on some Windows setups.
  productServiceUrl: 'http://localhost:8092/products/api/products',
  aiServiceUrl: 'http://127.0.0.1:8001',
  // Gemini AI service – matchmaking & match summary. See /GeminiAI for the FastAPI service.
  geminiAiServiceUrl: 'http://127.0.0.1:8002',
  
};
