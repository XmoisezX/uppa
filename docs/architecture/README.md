# Arquitetura do Portal Imobiliário

Este diretório armazena a documentação técnica e diagramas da arquitetura do produto, acompanhando as diretrizes definidas no `MASTER_PLAN.md`.

## Módulos Principais
1. **Localização**: Hierarquia Brasil > Estado > Cidade > Bairro com índices PostGIS.
2. **Imobiliárias e Membros**: RBAC multi-tenant para imobiliárias e corretores.
3. **Catálogo de Imóveis**: Properties, Features, Price History e Media.
4. **Pipeline de Importação**: Ingestão e normalização idempotente de feeds VRSync/XML.
5. **Busca e Mapas**: Consultas espaciais PostGIS via viewport / clusters.
6. **Leads e Analytics**: Captura de intenção e conversão WhatsApp.
