export const environment = {
  production: false,
  userServiceUrl:    'http://localhost:8081/users',
  sportServiceUrl:   'http://localhost:8084/sports',
  eventServiceUrl:   'http://localhost:8083/eventsCompetitions',
  matchServiceUrl: 'http://localhost:8087/matchs',
  terrainServiceUrl: 'http://localhost:8088/terrain',
  teamServiceUrl: 'http://localhost:8085/teams/api/teams',
  rewardServiceUrl: 'http://localhost:8086/rewards/api/rewards',
  // Free/local LLM service (no API key). See /PythonAI for the FastAPI + Ollama service.
  // Use 127.0.0.1 to avoid IPv6 localhost (::1) issues on some Windows setups.
  aiServiceUrl: 'http://127.0.0.1:8001'
};
