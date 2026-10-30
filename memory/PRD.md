# NL BUS - PRD

## Visão
Aplicativo mobile de mobilidade urbana para modernizar o transporte público de Nova Lima e região (Belo Horizonte, Raposos, Rio Acima, Sabará). Criado por Pedro Costa, Yago, Sarah e Ana.

## Stack
- Frontend: Expo (React Native) + expo-router + react-native-maps + @gorhom/bottom-sheet
- Backend: FastAPI + MongoDB (motor) + JWT + bcrypt
- Paleta: Verde & Azul (brandPrimary `#0284C7`, brandSecondary `#10B981`)

## Features (MVP implementado)
- **Autenticação**: email/senha (JWT 30d, bcrypt) + modo visitante
- **Mapa inicial (Home)**: pontos próximos de Nova Lima, linhas populares, busca
- **Linhas**: lista completa com busca e filtros por cidade (NL, BH, Raposos, Sabará, Rio Acima)
- **Detalhe da Linha**: trajeto no mapa com polyline, timeline de pontos, horários, próxima chegada, avaliação (estrelas + comentário), favoritar
- **Detalhe do Ponto**: mapa + linhas que passam + próximo horário
- **Planejar viagem**: origem/destino com sugestões; cálculo de melhor rota com tempo de caminhada + ônibus + tarifa
- **Perfil**: favoritos, info do projeto, logout
- **Localização em tempo real**: UI pronta (banner "em breve") — não implementado nesta versão

## Dados
- 18 pontos reais em Nova Lima e cidades vizinhas
- 7 linhas (101 Centro-Jardim Canadá, 202 Honório Bicalho, 303 BH Expresso, 404 Alphaville, 505 Raposos, 606 Rio Acima, 707 Sabará)
- Horários de partida realistas por dia da semana
- Seed automático no startup do backend

## Endpoints Backend
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/lines`, `GET /api/lines/{id}`
- `GET /api/stops`, `GET /api/stops/nearby`, `GET /api/stops/{id}`
- `GET/POST/DELETE /api/favorites`
- `POST /api/ratings`, `GET /api/ratings/{line_id}`
- `POST /api/planner`

## Próximos passos
1. Localização em tempo real dos veículos (WebSocket + simulação)
2. Alertas de chegada (push notifications)
3. Modo escuro
4. Integração com Google Places para origem/destino do planner
