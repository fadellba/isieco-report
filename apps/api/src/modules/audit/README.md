# Module Audit

Consultation contrôlée du journal métier `EvenementMetier`.

## Source de données

Les modules métier écrivent les événements dans la même transaction que les mutations sensibles. Le journal couvre notamment les comptes et rôles, référentiels, signalements, qualification, dossiers, affectations, interventions, photos, vérification, purge et clôture.

Le module Audit est en lecture seule. Il ne permet ni modification ni suppression d'événements.

## API de consultation

| Méthode | Route | Accès | Périmètre |
|---|---|---|---|
| GET | `/api/v1/audit/me` | Compte métier actif connecté | Événements où l'utilisateur est l'acteur ou l'utilisateur cible. |
| GET | `/api/v1/audit/accounts/:idUtilisateur/roles` | `ADMINISTRATEUR_COMPTES` | Uniquement `ROLE_ATTRIBUE` et `ROLE_REVOQUE` pour le compte ciblé. |

Les deux routes acceptent `page`, `pageSize` (maximum 100), `dateDebut`, `dateFin` et `typeEvenement`. La période filtre `dateEnregistrement` et les bornes sont inclusives.

## Limites de confidentialité

Les réponses contiennent l'identifiant d'événement, le type, les dates, l'origine, l'acteur et la cible. Elles excluent :

- `donneesAvant` et `donneesApres`, qui peuvent contenir des instantanés métier ;
- `motif`, champ texte libre susceptible de contenir des données personnelles ;
- `destinataireExterne` et les identifiants de corrélation ;
- toute URL signée, référence de stockage ou secret.

Il n'existe pas de route listant tous les événements du système. Le rôle `ADMINISTRATEUR_COMPTES` n'accorde pas de privilège métier général ; son accès d'audit est limité à l'historique des habilitations, responsabilité déjà comprise dans son périmètre. Aucun rôle global `AUDITEUR` n'est ajouté sans décision fonctionnelle et sécurité dédiée.

La cible d'un contenu de dossier est représentée par la paire UUID dossier/type de déchet, conformément à la clé composite du MLD.

## Tests

Les tests couvrent le filtrage acteur/cible, les événements de rôles, les bornes temporelles, les comptes inactifs, les comptes inexistants, la clé composite des cibles et l'absence de snapshots et de champs libres dans les réponses.
