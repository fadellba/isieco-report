# Décisions d'architecture (ADR)

Les décisions suivantes sont acceptées pour le MVP. Toute modification ultérieure doit expliquer le besoin, les alternatives et les conséquences, puis indiquer l'ADR remplacé.

## ADR-0001 : architecture client-serveur et monolithe modulaire

**Statut : accepté.** Trois blocs : Web d'administration, Mobile citoyen/agent et API NestJS commune. Le backend est un monolithe modulaire, pas une collection de microservices. Ce choix centralise transactions et règles métier tout en séparant les responsabilités par domaine.

## ADR-0002 : monorepo pnpm Workspaces

**Statut : accepté.** Un dépôt Git contient apps/api, apps/web, apps/mobile, packages/shared et packages/api-client. Les applications sont compilées et déployées indépendamment. Les packages partagés sont limités aux contrats et utilitaires transversaux.

## ADR-0003 : Supabase Auth comme fournisseur d'identité

**Statut : accepté.** Supabase Auth gère mots de passe, sessions et jetons. La base métier conserve le profil Utilisateur et le lie par auth_user_id. Aucun mot de passe, bearer token ou session n'est répliqué. La table SESSION est exclue du modèle transposé.

## ADR-0004 : autorisations côté API

**Statut : accepté.** Le backend vérifie le JWT, résout les rôles depuis la base métier et contrôle l'accès à la ressource et à l'action. L'inscription publique donne uniquement le rôle CITOYEN côté serveur. Le premier administrateur est provisionné par une opération contrôlée. Masquer un bouton côté client ne constitue pas un contrôle d'accès.

## ADR-0005 : PostgreSQL et Prisma

**Statut : accepté.** PostgreSQL porte le modèle relationnel. Prisma gère les modèles et le client typé. Les CHECK, index partiels, triggers et autres invariants non exprimables dans Prisma doivent être ajoutés dans des migrations SQL versionnées et testées.

## ADR-0006 : sécurité et moindre privilège

**Statut : accepté.** Les secrets restent côté serveur, les buckets de médias sont privés par défaut, les entrées sont validées et les décisions sensibles sont auditables. RLS complète la sécurité des accès Supabase ; elle ne remplace pas les autorisations métier NestJS.

## Journal des décisions futures

Toute intégration externe, mode hors connexion, notification, exigence de disponibilité, changement de fournisseur d'hébergement ou séparation en microservices doit faire l'objet d'une décision explicite avant implémentation.