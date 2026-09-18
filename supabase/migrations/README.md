# Migrations Supabase

As migrations do PostgreSQL + PostGIS serão implementadas sequencialmente a partir do Prompt 2 do MASTER_PLAN:

- Prompt 2: Localização (states, cities, neighborhoods, PostGIS Point);
- Prompt 3: Imobiliárias (agencies, agency_members);
- Prompt 4: Properties (properties, features, property_media, property_price_history);
- Demais fases: leads, feeds, favorites, saved_searches.

Regra 3 do MASTER_PLAN: Alterações de banco somente por migrations. Nunca alterar estrutura manualmente sem migration correspondente.
