export const environment = {
  production: false,
  userServiceUrl: 'http://localhost:8081',
  reclamationServiceUrl: 'http://localhost:8082/reclamations/api/reclamations',
  sportServiceUrl: 'http://localhost:8084/sports',
  clubServiceUrl: 'http://localhost:8084/sports/api/clubs',
  eventServiceUrl: 'http://localhost:8083/api/events',
  matchServiceUrl: 'http://localhost:8087/matchs',
  socialServiceUrl: 'http://localhost:8090/social/api',
  reservationServiceUrl: 'http://localhost:8089/reservations/api/reservations',
  terrainServiceUrl: 'http://localhost:8088/terrain',
  teamServiceUrl: 'http://localhost:8085/teams/api/teams',
  rewardServiceUrl: 'http://localhost:8086/rewards/api/rewards',
  productServiceUrl: 'http://localhost:8092/products/api/products',
  aiServiceUrl: 'http://127.0.0.1:8001',
  postgenerationkey: '',
  // Gemini AI service – matchmaking & match summary. See /GeminiAI for the FastAPI service.
  geminiAiServiceUrl: 'http://127.0.0.1:8003',
  openRouterUrl: 'https://openrouter.ai/api/v1/chat/completions'
};
