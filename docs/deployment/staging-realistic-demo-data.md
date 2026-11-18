# Jeu de données de démonstration réaliste pour Staging

Ce document détaille le jeu de données réalistes déployé sur l'environnement staging pour les démos, évaluations de jury et tests d'acceptation produit.

Tous les noms artificiels contenant "staging", "test" ou "e2e" ont été remplacés par de véritables identités, numéros de contact, libellés d'équipes et signalements contextualisés géographiquement à Dakar avec de vraies photographies haute définition.

---

## 1. Comptes utilisateurs et identifiants

Tous les comptes partagent par défaut le même mot de passe pour faciliter la navigation :
**Mot de passe commun :** `IsiEco2026!Test` *(ou celui spécifié lors du déclenchement du workflow)*

| Nom & Prénom | Rôle métier | Adresse e-mail | Téléphone |
|---|---|---|---|
| **Abdoulaye Faye** | **Super Administrateur Global** *(Tous les 8 rôles)* | `admin.global@isieco.sn` | +221 77 123 45 67 |
| **Fatou Diallo** | **Citoyenne engagée** (`CITOYEN`) | `fatou.diallo@gmail.com` | +221 77 234 56 78 |
| **Moussa Ba** | **Citoyen bénévole** (`CITOYEN`) | `moussa.ba@outlook.com` | +221 78 345 67 89 |
| **Mariama Sow** | **Agent Qualification & Triage** | `mariama.sow@isieco.sn` | +221 76 456 78 90 |
| **Amadou Fall** | **Chef de division Traitement** | `amadou.fall@isieco.sn` | +221 70 567 89 01 |
| **Awa Ndiaye** | **Responsable Affectation & Logistique** | `awa.ndiaye@isieco.sn` | +221 77 678 90 12 |
| **Cheikh Diop** | **Chef d'équipe Intervention Terrain** | `cheikh.diop@isieco.sn` | +221 77 789 01 23 |
| **Oumy Traoré** | **Inspectrice Vérification & Clôture** | `oumy.traore@isieco.sn` | +221 78 890 12 34 |
| **Ibrahima Kane** | **Gestionnaire Référentiels & Équipes** | `ibrahima.kane@isieco.sn` | +221 76 901 23 45 |
| **Aminata Gueye** | **Administratrice Plateforme & Comptes** | `aminata.gueye@isieco.sn` | +221 70 012 34 56 |

> **Conseil pour les démos :** Connectez-vous avec `admin.global@isieco.sn` pour avoir accès sans déconnexion à l'ensemble du cycle de vie sur le Web et sur l'application mobile.

---

## 2. Équipes d'intervention terrain

- **Brigade Verte Dakar-Centre** : Équipe mobile d'intervention rapide pour le Plateau, Médina et Fann. *(Compétences : Plastiques, Ménager, Encombrants)*
- **Équipe Salubrité Almadies & Ngor** : Nettoyage des zones côtières, plages et axes touristiques. *(Compétences : Plastiques, Végétaux, Ménager)*
- **Unité Déblaiement & BTP Grand-Dakar** : Engins lourds et camions bennes pour les gravats et dépôts volumineux. *(Compétences : Gravats, Encombrants)*
- **Éco-Patrouille Parcelles & Guédiawaye** : Sensibilisation et évacuation des points noirs urbains. *(Compétences : Ménager, Plastiques, Végétaux)*

---

## 3. Signalements, dossiers et photographies réelles

Les signalements sont répartis à des stades différents du cycle de vie pour illustrer chaque écran :

1. **Médina (Angle Rue 22 x Rue 11) :**
   - *Statut :* Clôturé et vérifié conforme.
   - *Contenu :* Accumulation de plastiques et cartons bloquant un caniveau.
   - *Preuves :* Vraie photo du dépôt initial + Vraie photo de la rue nettoyée et balayée après intervention terrain + PV de conformité signé par l'inspectrice de salubrité.
2. **Almadies (Route des Almadies, face King Fahd) :**
   - *Statut :* Dossier ouvert, intervention en cours.
   - *Contenu :* 12 tonnes de gravats de chantier et dalles de béton.
   - *Preuves :* Vraie photo de gravats et débris de construction, équipe terrain mobilisée.
3. **Dakar-Plateau (Avenue Peytavin x Rue Carnot) :**
   - *Statut :* Dossier ouvert et affecté, en attente d'intervention.
   - *Contenu :* Poubelles débordantes et ordures ménagères.
   - *Preuves :* Vraie photo de bacs débordants.
4. **Fann (Corniche Ouest, près UCAD) :**
   - *Statut :* Qualifié, prêt pour rattachement à un dossier.
   - *Contenu :* Détritus et emballages sur le trottoir piéton.
   - *Preuves :* Vraie photo d'emballages plastiques.
5. **Ouakam (Cité Assemblée) :**
   - *Statut :* Tout juste transmis par le citoyen, en attente de qualification.
   - *Contenu :* Dépôt sauvage d'encombrants et ferrailles.
   - *Preuves :* Vraie photo de grand dépôt sauvage.

---

## 4. Comment exécuter le peuplement

1. Sur GitHub, ouvrir **Actions → Staging Seed Realistic Data**.
2. Choisir la branche `main`.
3. Sélectionner `SEED_REALISTIC` pour `seed_realistic_data`.
4. *(Optionnel)* Définir un mot de passe commun (par défaut : `IsiEco2026!Test`).
5. Cliquer sur **Run workflow**. Le job télécharge les photographies réelles, les injecte dans Supabase Storage privé et crée l'ensemble des entités métier et comptes réalistes.
